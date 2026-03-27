package pos.ambrosia.utest

import pos.ambrosia.utils.Bolt11Decoder
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class Bolt11DecoderTest {

    // Mainnet invoice with description "1 cup coffee" (updated BOLT11 spec vector with payment secret)
    private val invoiceWithDescription =
        "lnbc2500u1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcy" +
            "q5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0r" +
            "l77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39" +
            "tuven09sam30g4vgpfna3rh"

    // Mainnet invoice with description hash (tag 'h') — no readable description
    private val invoiceWithDescriptionHash =
        "lnbc20m1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5" +
            "rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98" +
            "klysy043l2ahrqs9qrsgq7ea976txfraylvgzuxs8kgcw23ezlrszfnh8r6qtfpr6cxga50aj6txm9rxrydzd" +
            "06dfeawfk6swupvz4erwnyutnjq7x39ymw6j38gp7ynn44"

    @Test
    fun `given null invoice returns null`() {
        assertNull(Bolt11Decoder.extractDescription(null))
    }

    @Test
    fun `given blank invoice returns null`() {
        assertNull(Bolt11Decoder.extractDescription(""))
        assertNull(Bolt11Decoder.extractDescription("   "))
    }

    @Test
    fun `given malformed invoice returns null`() {
        assertNull(Bolt11Decoder.extractDescription("not-a-bolt11-invoice"))
        assertNull(Bolt11Decoder.extractDescription("lnbc1randomgarbage"))
    }

    @Test
    fun `given valid invoice with description hash returns null`() {
        assertNull(Bolt11Decoder.extractDescription(invoiceWithDescriptionHash))
    }

    @Test
    fun `given valid invoice with readable description returns description`() {
        assertEquals("1 cup coffee", Bolt11Decoder.extractDescription(invoiceWithDescription))
    }
}
