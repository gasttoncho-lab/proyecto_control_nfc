package com.example.loginapp

import java.math.BigDecimal
import java.text.NumberFormat
import java.util.Locale

object MoneyFormatter {
    private val currencyFormatter = NumberFormat.getCurrencyInstance(Locale("es", "MX"))

    fun formatCents(cents: Long): String {
        val amount = BigDecimal.valueOf(cents, 2)
        return currencyFormatter.format(amount)
    }

    fun formatCentsPlain(cents: Long): String {
        val absoluteCents = kotlin.math.abs(cents)
        val units = absoluteCents / 100
        val remainder = absoluteCents % 100
        val sign = if (cents < 0) "-" else ""
        return "$sign$units.${remainder.toString().padStart(2, '0')}"
    }
}
