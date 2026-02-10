package com.example.loginapp.util

import org.junit.Assert.assertEquals
import org.junit.Test

class CentsFormatTest {
    @Test
    fun `shows cents as raw strings`() {
        assertEquals("8300", CentsFormat.show(8300L))
        assertEquals("0", CentsFormat.show(0L))
        assertEquals("1500", CentsFormat.show(1500))
    }
}
