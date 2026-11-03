package pos.ambrosia.utest

import pos.ambrosia.BACKUP_IMPORT_MAX_REQUEST_BODY_BYTES
import pos.ambrosia.DEFAULT_MAX_REQUEST_BODY_BYTES
import pos.ambrosia.UPLOAD_MAX_REQUEST_BODY_BYTES
import pos.ambrosia.requestBodyLimitFor
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class RequestBodyLimitTest {
    @Test
    fun `uploads route gets the upload-specific limit`() {
        assertEquals(UPLOAD_MAX_REQUEST_BODY_BYTES, requestBodyLimitFor("/uploads"))
    }

    @Test
    fun `backup import route gets the backup-specific limit`() {
        assertEquals(BACKUP_IMPORT_MAX_REQUEST_BODY_BYTES, requestBodyLimitFor("/backup/import"))
    }

    @Test
    fun `every other route gets the default limit`() {
        assertEquals(DEFAULT_MAX_REQUEST_BODY_BYTES, requestBodyLimitFor("/orders"))
        assertEquals(DEFAULT_MAX_REQUEST_BODY_BYTES, requestBodyLimitFor("/"))
        assertEquals(DEFAULT_MAX_REQUEST_BODY_BYTES, requestBodyLimitFor("/backup/export"))
    }

    @Test
    fun `the upload limit is smaller than the backup import limit`() {
        assertTrue(UPLOAD_MAX_REQUEST_BODY_BYTES < BACKUP_IMPORT_MAX_REQUEST_BODY_BYTES)
    }

    @Test
    fun `the default limit is smaller than the upload limit`() {
        assertTrue(DEFAULT_MAX_REQUEST_BODY_BYTES < UPLOAD_MAX_REQUEST_BODY_BYTES)
    }
}
