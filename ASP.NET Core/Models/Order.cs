using System;
using System.ComponentModel.DataAnnotations;

namespace ASP_NET_Core.Models;
public class Order {
    public int OrderID { get; set; }

    [Required(ErrorMessage = "Order Date is required.")]
    public DateTime? OrderDate { get; set; }

    [StringLength(40, ErrorMessage = "Ship Name must not exceed 40 characters.")]
    public string ShipName { get; set; }

    [StringLength(15, ErrorMessage = "Ship Country must not exceed 15 characters.")]
    public string ShipCountry { get; set; }
}
