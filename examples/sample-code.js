
function calculateTotal(price, quantity) {
  var total = price * quantity;
  console.log(total);
  return total == null ? 0 : total;
}

calculateTotal(100, 2);
