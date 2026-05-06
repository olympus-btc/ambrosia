package pos.ambrosia.utest

import pos.ambrosia.utils.Bolt11Decoder
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
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

    @Test
    fun `decodeInvoice returns null for null input`() {
        assertNull(Bolt11Decoder.decodeInvoice(null))
    }

    @Test
    fun `decodeInvoice returns null for blank input`() {
        assertNull(Bolt11Decoder.decodeInvoice(""))
        assertNull(Bolt11Decoder.decodeInvoice("   "))
    }

    @Test
    fun `decodeInvoice returns null for malformed invoice`() {
        assertNull(Bolt11Decoder.decodeInvoice("not-a-bolt11-invoice"))
        assertNull(Bolt11Decoder.decodeInvoice("lnbc1randomgarbage"))
    }

    @Test
    fun `decodeInvoice extracts amount and description from valid invoice`() {
        val result = Bolt11Decoder.decodeInvoice(invoiceWithDescription)
        assert(result != null)
        assertEquals(250000L, result!!.amountSat)
        assertEquals("1 cup coffee", result.description)
    }

    @Test
    fun `decodeInvoice handles invoice with description hash`() {
        val result = Bolt11Decoder.decodeInvoice(invoiceWithDescriptionHash)
        assert(result != null)
        assertEquals(2000000L, result!!.amountSat)
        assertNull(result.description)
    }

    // region extractAmountSat — regression for B2 (payInvoice reported 0 sats on fixed-amount invoices)

    @Test
    fun `extractAmountSat returns null for null invoice`() {
        assertNull(Bolt11Decoder.extractAmountSat(null))
    }

    @Test
    fun `extractAmountSat returns null for malformed invoice`() {
        assertNull(Bolt11Decoder.extractAmountSat("not-a-bolt11"))
    }

    @Test
    fun `extractAmountSat returns correct satoshi amount for lnbc2500u invoice`() {
        // lnbc2500u = 2500 microBTC = 250 000 sat
        assertEquals(250_000L, Bolt11Decoder.extractAmountSat(invoiceWithDescription))
    }

    // endregion

    // region extractPaymentHash — regression for B2 (payInvoice returned empty payment hash)

    @Test
    fun `extractPaymentHash returns null for null invoice`() {
        assertNull(Bolt11Decoder.extractPaymentHash(null))
    }

    @Test
    fun `extractPaymentHash returns null for malformed invoice`() {
        assertNull(Bolt11Decoder.extractPaymentHash("not-a-bolt11"))
    }

    @Test
    fun `extractPaymentHash returns 64-char hex string for valid invoice`() {
        val hash = Bolt11Decoder.extractPaymentHash(invoiceWithDescription)
        assertNotNull(hash)
        assertEquals(64, hash.length)
        // BOLT11 test-vector payment hash
        assertEquals("0001020304050607080900010203040506070809000102030405060708090102", hash)
    }

    // endregion
}
