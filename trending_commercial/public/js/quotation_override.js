frappe.ui.form.on("Quotation", {
	refresh: function(frm) {
		render_commercial_actions(frm);
		sync_commercial_rows_if_needed(frm);
	},
	management_fee_pct: function(frm) {
		recalc_commercial_quotation(frm);
	},
	vat_rate_applied: function(frm) {
		recalc_commercial_quotation(frm);
	}
});

frappe.ui.form.on("Quotation Item", {
	qty: function(frm, cdt, cdn) {
		let item = locals[cdt][cdn];
		if (!is_management_fee_item(item)) {
			recalc_commercial_quotation(frm);
		}
	},
	rate: function(frm, cdt, cdn) {
		let item = locals[cdt][cdn];
		if (!is_management_fee_item(item)) {
			recalc_commercial_quotation(frm);
		}
	},
	items_remove: function(frm) {
		recalc_commercial_quotation(frm);
	}
});

function is_management_fee_item(it) {
	if (!it) return false;
	let code = (it.item_code || "").trim().toUpperCase();
	let name = (it.item_name || "").toLowerCase();
	let desc = (it.description || "").toLowerCase();
	if (code === "MANAGEMENT-FEE" || code === "MANAGEMENT_FEE" || code === "MANAGEMENT FEES") return true;
	if (name.includes("agency") && name.includes("fee")) return true;
	if (name.includes("management") && name.includes("fee")) return true;
	if (desc.includes("agency / management fee")) return true;
	return false;
}

function is_vat_tax_row(t) {
	if (!t) return false;
	let head = (t.account_head || "").toUpperCase();
	let desc = (t.description || "").toUpperCase();
	return head.includes("2311") || head.includes("VAT") || desc.includes("VAT");
}

function set_field_value_safe(frm, fieldname, value) {
	if (frm.fields_dict && frm.fields_dict[fieldname]) {
		frm.set_value(fieldname, value);
	} else {
		frm.doc[fieldname] = value;
	}
}

function sync_commercial_rows_if_needed(frm) {
	if (frm.doc.docstatus === 0 && (frm.doc.items || []).length > 0) {
		let operational_items = (frm.doc.items || []).filter(it => !is_management_fee_item(it));
		if (operational_items.length > 0) {
			let has_fee = (frm.doc.items || []).some(it => is_management_fee_item(it));
			let has_vat = (frm.doc.taxes || []).some(t => is_vat_tax_row(t));
			if (!has_fee || !has_vat || flt(frm.doc.management_fee_amount) === 0) {
				recalc_commercial_quotation(frm);
			}
		}
	}
}

function recalc_commercial_quotation(frm) {
	if (frm._recalculating_commercial) return;
	frm._recalculating_commercial = true;

	try {
		// 1. Calculate operational subtotal (excluding fee row)
		let base_subtotal = 0;
		(frm.doc.items || []).forEach(it => {
			if (!is_management_fee_item(it)) {
				let amt = flt(flt(it.qty) * flt(it.rate), 2);
				it.amount = amt;
				base_subtotal += amt;
			}
		});
		base_subtotal = flt(base_subtotal, 2);

		let fee_pct = flt(frm.doc.management_fee_pct || 0);
		let fee_amt = flt(base_subtotal * (fee_pct / 100.0), 2);

		// 2. Synchronize Agency / Management Fee line item
		let fee_row = (frm.doc.items || []).find(it => is_management_fee_item(it));
		if (fee_pct > 0 && base_subtotal > 0) {
			if (!fee_row) {
				fee_row = frm.add_child("items");
			}
			fee_row.item_code = "MANAGEMENT-FEE";
			fee_row.item_name = "Agency / Management Fee";
			fee_row.description = "Agency / Management Fee (" + fee_pct + "%)";
			fee_row.qty = 1;
			fee_row.rate = fee_amt;
			fee_row.amount = fee_amt;
			fee_row.uom = fee_row.uom || "Nos";
			fee_row.stock_uom = fee_row.stock_uom || "Nos";
			fee_row.conversion_factor = 1.0;
		} else if (fee_row) {
			let idx = (frm.doc.items || []).findIndex(it => is_management_fee_item(it));
			if (idx !== -1) {
				frm.doc.items.splice(idx, 1);
			}
			fee_amt = 0;
		}
		frm.refresh_field("items");

		// 3. Synchronize VAT Tax Row in Taxes table under account [2311 - VAT - T]
		let vat_pct = flt(frm.doc.vat_rate_applied || 0);
		let vat_row = (frm.doc.taxes || []).find(t => is_vat_tax_row(t));
		if (vat_pct > 0 && base_subtotal > 0) {
			if (!vat_row) {
				vat_row = frm.add_child("taxes");
			}
			vat_row.charge_type = "On Net Total";
			vat_row.account_head = "2311 - VAT - T";
			vat_row.rate = vat_pct;
			vat_row.description = "VAT " + vat_pct + "%";
		} else if (vat_row && base_subtotal <= 0) {
			let idx = (frm.doc.taxes || []).findIndex(t => is_vat_tax_row(t));
			if (idx !== -1) {
				frm.doc.taxes.splice(idx, 1);
			}
		}
		frm.refresh_field("taxes");

		// 4. Update calculated summary fields safely
		let net_total = flt(base_subtotal + fee_amt, 2);
		let vat_amt = flt(net_total * (vat_pct / 100.0), 2);
		let grand_total = flt(net_total + vat_amt, 2);

		frm.doc.items_subtotal = base_subtotal;
		frm.doc.management_fee_amount = fee_amt;
		frm.doc.net_total_before_vat = net_total;
		frm.doc.vat_amount = vat_amt;

		set_field_value_safe(frm, "management_fee_amount", fee_amt);
		set_field_value_safe(frm, "net_total_before_vat", net_total);
		set_field_value_safe(frm, "vat_amount", vat_amt);

		// 5. Update milestone amounts
		(frm.doc.milestones || []).forEach(m => {
			m.amount = flt(grand_total * (flt(m.percentage) / 100.0), 2);
		});
		frm.refresh_field("milestones");

		// 6. Invoke standard ERPNext tax calculation engine if present
		if (frm.cscript && typeof frm.cscript.calculate_taxes_and_totals === "function") {
			try {
				frm.cscript.calculate_taxes_and_totals();
			} catch (e) {
				console.warn("ERPNext calculate_taxes_and_totals:", e);
			}
		}
	} finally {
		frm._recalculating_commercial = false;
	}
}

function render_commercial_actions(frm) {
	if (frm.is_new()) return;

	let status = frm.doc.approval_status || "Draft";
	if (status === "Draft") {
		let btn = frm.add_custom_button(__("Submit for Approval"), function() {
			frappe.call({
				method: "trending_commercial.trending_commercial.api.quotation.submit_quotation_for_approval",
				args: { quotation_name: frm.doc.name },
				callback: function(r) {
					frappe.msgprint(r.message.message);
					frm.reload_doc();
				}
			});
		});
		if (btn && btn.addClass) btn.addClass("btn-warning");
	} else if (status === "Pending Approval") {
		if (frappe.user_roles.includes("System Manager") || frappe.user_roles.includes("Commercial Director")) {
			let btn = frm.add_custom_button(__("Approve Quotation"), function() {
				frappe.call({
					method: "trending_commercial.trending_commercial.api.quotation.approve_quotation",
					args: { quotation_name: frm.doc.name },
					callback: function(r) {
						frappe.msgprint(r.message.message);
						frm.reload_doc();
					}
				});
			});
			if (btn && btn.addClass) btn.addClass("btn-success");
		}
	}
}
