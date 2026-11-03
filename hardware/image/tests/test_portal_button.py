"""Execute the actual portal button script without touching network devices."""

import ast
import json
import subprocess
import unittest
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
PORTAL_PATHS = (
    REPOSITORY_ROOT / "hardware/image/common/portal/ambrosia-wifi-portal",
    REPOSITORY_ROOT / "hardware/preinstalled/portal/ambrosia-wifi-portal",
)

JAVASCRIPT_TEST_HARNESS = r"""
const assert = require('node:assert/strict');
const virtualMachine = require('node:vm');
const testScenario = JSON.parse(require('node:fs').readFileSync(0, 'utf8'));
const pageElements = {};
for (const elementId of ['btn-go', 'pending', 'posurl', 'commit-form']) {
  pageElements[elementId] = {
    classList: { add(className) { this[className] = true; }, remove(className) { this[className] = false; } },
    addEventListener(event, handler) { this[event] = handler; },
  };
}
pageElements.posurl.textContent = "http://ambrosia-test.local/trust/";
const submittedRequests = [];
const navigator = {};
if (testScenario.mode === 'modern') {
  navigator.clipboard = { writeText: async () => {} };
} else if (testScenario.mode === 'rejected') {
  navigator.clipboard = { writeText: async () => { throw Error('Denied'); } };
}
const browserContext = {
  navigator,
  document: {
    getElementById: elementId => pageElements[elementId],
    createElement: () => ({
      style: {}, setAttribute() {}, focus() {}, select() {}, setSelectionRange() {},
    }),
    body: { appendChild() {}, removeChild() {} },
    execCommand: () => {
      if (testScenario.mode === 'throws') throw Error('Clipboard blocked');
      return testScenario.mode !== 'unavailable';
    },
    createRange: () => ({ selectNodeContents() {} }),
  },
  window: { getSelection: () => ({ removeAllRanges() {}, addRange() {} }) },
  FormData: function(submittedForm) { this.form = submittedForm; },
  fetch: async (requestUrl, requestOptions) => {
    submittedRequests.push({ url: requestUrl, options: requestOptions });
    if (testScenario.response === 'offline') throw Error('Network error');
    return { ok: testScenario.response !== 'rejected' };
  },
};
virtualMachine.runInNewContext(testScenario.script, browserContext);
pageElements['btn-go'].click();
pageElements['btn-go'].click();
setImmediate(() => {
  assert.equal(submittedRequests.length, 1, 'click must send the Wi-Fi connection request');
  assert.equal(submittedRequests[0].url, '/commit');
  assert.equal(submittedRequests[0].options.method, 'POST');
  assert.equal(submittedRequests[0].options.body.form, pageElements['commit-form']);
  if (testScenario.response !== 'ok') {
    assert.equal(pageElements['btn-go'].disabled, false, 'failed request must allow retry');
    assert.equal(pageElements['btn-go'].classList.done, false);
    assert.match(pageElements.pending.textContent, /No pudimos confirmar/);
    return;
  }
  assert.equal(pageElements['btn-go'].disabled, true);
  assert.equal(pageElements['btn-go'].classList.done, true, 'button must turn green');
  assert.equal(pageElements.pending.classList.show, true);
  assert.match(pageElements['btn-go'].textContent,
    ['unavailable', 'throws'].includes(testScenario.mode) ? /Guarda la dirección/ : /Dirección copiada/);
});
"""


class PortalButtonTests(unittest.TestCase):
    def test_packaged_portals_are_identical(self):
        self.assertEqual(PORTAL_PATHS[0].read_bytes(), PORTAL_PATHS[1].read_bytes())

    def test_copy_and_connect_in_each_clipboard_mode(self):
        for portal_path in PORTAL_PATHS:
            module_tree = ast.parse(portal_path.read_text())
            success_template = next(
                ast.literal_eval(assignment_node.value)
                for assignment_node in module_tree.body
                if isinstance(assignment_node, ast.Assign)
                and any(
                    isinstance(assignment_target, ast.Name)
                    and assignment_target.id == "SUCCESS"
                    for assignment_target in assignment_node.targets
                )
            )
            button_script = success_template.split("<script>", 1)[1].split(
                "</script>", 1
            )[0]
            for clipboard_mode, server_response in [
                (clipboard_mode, "ok")
                for clipboard_mode in (
                    "modern",
                    "legacy",
                    "rejected",
                    "unavailable",
                    "throws",
                )
            ] + [("legacy", "offline"), ("legacy", "rejected")]:
                with self.subTest(
                    portal=str(portal_path.relative_to(REPOSITORY_ROOT)),
                    clipboard=clipboard_mode,
                    response=server_response,
                ):
                    node_process = subprocess.run(
                        [
                            "node",
                            "--unhandled-rejections=strict",
                            "-e",
                            JAVASCRIPT_TEST_HARNESS,
                        ],
                        input=json.dumps(
                            {
                                "script": button_script,
                                "mode": clipboard_mode,
                                "response": server_response,
                            }
                        ),
                        text=True,
                        capture_output=True,
                        timeout=10,
                        check=False,
                    )
                    self.assertEqual(node_process.returncode, 0, node_process.stderr)
