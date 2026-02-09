package com.example.loginapp

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.loginapp.databinding.ItemChargeProductBinding
import java.text.NumberFormat
import java.util.Locale

data class ChargeProductItem(
    val id: String,
    val name: String,
    val priceCents: Int,
    var quantity: Int = 0
)

class ChargeProductAdapter(
    private val onIncrease: (ChargeProductItem) -> Unit,
    private val onDecrease: (ChargeProductItem) -> Unit,
) : RecyclerView.Adapter<ChargeProductAdapter.ProductViewHolder>() {

    private val items = mutableListOf<ChargeProductItem>()
    var isLocked: Boolean = false

    private val formatter = NumberFormat.getCurrencyInstance(Locale("es", "MX"))

    fun submitItems(newItems: List<ChargeProductItem>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProductViewHolder {
        val binding = ItemChargeProductBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ProductViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ProductViewHolder, position: Int) {
        val item = items[position]
        holder.bind(item, formatter, isLocked, onIncrease, onDecrease)
    }

    override fun getItemCount(): Int = items.size

    class ProductViewHolder(private val binding: ItemChargeProductBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(
            item: ChargeProductItem,
            formatter: NumberFormat,
            isLocked: Boolean,
            onIncrease: (ChargeProductItem) -> Unit,
            onDecrease: (ChargeProductItem) -> Unit,
        ) {
            binding.tvProductName.text = item.name
            binding.tvProductPrice.text = formatter.format(item.priceCents / 100.0)
            binding.tvProductQty.text = item.quantity.toString()

            binding.btnQtyPlus.isEnabled = !isLocked
            binding.btnQtyMinus.isEnabled = !isLocked && item.quantity > 0

            binding.btnQtyPlus.setOnClickListener { onIncrease(item) }
            binding.btnQtyMinus.setOnClickListener { onDecrease(item) }
        }
    }
}
