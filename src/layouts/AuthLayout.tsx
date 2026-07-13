import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Receipt, Quote } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden gradient-primary">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }} />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-bold">InvoiceGen</p>
              <p className="text-xs text-white/70">Premium Invoicing & Payments</p>
            </div>
          </div>

          <div className="space-y-6">
            <Quote className="h-10 w-10 text-white/40" />
            <p className="text-2xl font-medium leading-relaxed text-white/90 max-w-md">
              The most elegant way to manage invoices, payments, and customer relationships for your business.
            </p>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {['A', 'D', 'V', 'S'].map((initial, i) => (
                  <div key={i} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 text-sm font-semibold">
                    {initial}
                  </div>
                ))}
              </div>
              <p className="text-sm text-white/70">Trusted by 10,000+ businesses</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm text-white/60">
            <span>© 2025 InvoiceGen</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white">
              <Receipt className="h-5 w-5" />
            </div>
            <p className="text-xl font-bold">InvoiceGen</p>
          </div>
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
