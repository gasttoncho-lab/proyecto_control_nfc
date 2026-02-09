package com.example.loginapp

import org.junit.Assert.assertEquals
import org.junit.Test

class MoneyCentsTest {
    @Test
    fun `subtract cents preserves integer math`() {
        val startingBalance = 8300L
        val charge = 2500L

        val remaining = startingBalance - charge

        assertEquals(5800L, remaining)
    }
}
