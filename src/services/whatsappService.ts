import { getCurrentCompanyId } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/utils";
import { communicationService } from "./reportsCommunicationService";

export const sendInvoiceWhatsapp = async (id:string)=>{
    const companyId = await getCurrentCompanyId();

    const {data : invoice, error : invoiceErr} = await supabase
    .from('invoices')
    .select('*, customers!invoices_customerId_fkey(id, name, email, mobile, businessName)')
    .eq('companyId', companyId)
    .eq('id', id)
    .single();

    if (invoiceErr){  
        console.log(invoiceErr);
        throw new Error(`${invoiceErr}`)
    };
    if (!invoice) throw new Error("Invoice not found");

    const {data : template, error} = await supabase
    .from("message_templates")
    .select("*")
    .eq("companyId", companyId)
    .eq("channel", "WHATSAPP")
    .eq("isActive", true)
    .single();

    if (error){  
        console.log(error);
        throw new Error("[Whatsapp] No active template found")
    };
    if (!template) throw new Error("Whatsapp template not found");
    
    const {customers} = invoice;

    const invoiceVariables = {
        customer_name: customers.name,
        invoice_number: invoice.number,
        amount: formatCurrency(invoice.total),
        due_date: formatDate(invoice.dueDate),
        company_name: "InvoiceGen",
        payment_link: invoice.paymentLink || "",
    }

    if (!template.body) return "";

    let result = template.body;
    
    Object.entries(invoiceVariables).forEach(([key, value]) => {
        result = result.replaceAll(
        `{{${key}}}`,
        value == null ? "" : String(value)
        );
    });    

    communicationService.sendInvoiceEmail(invoice.id, "WHATSAPP")

    return `https://wa.me/${customers?.mobile}?text=${encodeURIComponent(result)}`
}