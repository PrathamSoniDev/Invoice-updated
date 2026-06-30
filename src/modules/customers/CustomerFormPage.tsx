import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { customerService } from '@/services/customerService';
import { Users, Save } from 'lucide-react';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  businessName: z.string().min(2, 'Business name is required'),
  gstNumber: z.string().optional(),
  email: z.string().email('Valid email is required'),
  mobile: z.string().min(10, 'Valid mobile number is required'),
  whatsapp: z.string().optional(),
  billingLine1: z.string().min(5, 'Address is required'),
  billingLine2: z.string().optional(),
  billingCity: z.string().min(2, 'City is required'),
  billingState: z.string().min(2, 'State is required'),
  billingPincode: z.string().min(6, 'Pincode is required'),
  shippingLine1: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingState: z.string().optional(),
  shippingPincode: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (id) {
      customerService.get(id).then((c) => {
        if (c) {
          setValue('name', c.name);
          setValue('businessName', c.businessName);
          setValue('gstNumber', c.gstNumber);
          setValue('email', c.email);
          setValue('mobile', c.mobile);
          setValue('whatsapp', c.whatsapp);
          setValue('billingLine1', c.billingAddress.line1);
          setValue('billingLine2', c.billingAddress.line2);
          setValue('billingCity', c.billingAddress.city);
          setValue('billingState', c.billingAddress.state);
          setValue('billingPincode', c.billingAddress.pincode);
          setValue('shippingLine1', c.shippingAddress.line1);
          setValue('shippingCity', c.shippingAddress.city);
          setValue('shippingState', c.shippingAddress.state);
          setValue('shippingPincode', c.shippingAddress.pincode);
          setValue('notes', c.notes);
        }
        setLoading(false);
      });
    }
  }, [id, setValue]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    const payload = {
      name: data.name,
      businessName: data.businessName,
      gstNumber: data.gstNumber || '',
      email: data.email,
      mobile: data.mobile,
      whatsapp: data.whatsapp || data.mobile,
      billingAddress: {
        line1: data.billingLine1,
        line2: data.billingLine2,
        city: data.billingCity,
        state: data.billingState,
        pincode: data.billingPincode,
        country: 'India',
      },
      shippingAddress: sameAddress ? {
        line1: data.billingLine1,
        line2: data.billingLine2,
        city: data.billingCity,
        state: data.billingState,
        pincode: data.billingPincode,
        country: 'India',
      } : {
        line1: data.shippingLine1 || '',
        city: data.shippingCity || '',
        state: data.shippingState || '',
        pincode: data.shippingPincode || '',
        country: 'India',
      },
      notes: data.notes,
      status: 'active' as const,
    };

    if (isEdit && id) {
      await customerService.update(id, payload);
      toast.success('Customer updated successfully');
    } else {
      await customerService.create(payload);
      toast.success('Customer created successfully');
    }
    setSaving(false);
    navigate('/customers');
  };

  if (loading) return <div className="py-16 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={isEdit ? 'Edit Customer' : 'New Customer'}
        description={isEdit ? 'Update customer information' : 'Add a new customer to your database'}
        back
        icon={Users}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Basic Info */}
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Contact Name *</Label>
              <Input id="name" placeholder="John Doe" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input id="businessName" placeholder="Acme Corp" {...register('businessName')} />
              {errors.businessName && <p className="text-xs text-destructive">{errors.businessName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input id="gstNumber" placeholder="27AABCI1234L1Z5" className="font-mono" {...register('gstNumber')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" placeholder="john@acme.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile *</Label>
              <Input id="mobile" placeholder="+91 9876543210" {...register('mobile')} />
              {errors.mobile && <p className="text-xs text-destructive">{errors.mobile.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" placeholder="+91 9876543210" {...register('whatsapp')} />
            </div>
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Billing Address</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="billingLine1">Address Line 1 *</Label>
              <Input id="billingLine1" placeholder="123 Main Street" {...register('billingLine1')} />
              {errors.billingLine1 && <p className="text-xs text-destructive">{errors.billingLine1.message}</p>}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="billingLine2">Address Line 2</Label>
              <Input id="billingLine2" placeholder="Suite 100" {...register('billingLine2')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingCity">City *</Label>
              <Input id="billingCity" placeholder="Mumbai" {...register('billingCity')} />
              {errors.billingCity && <p className="text-xs text-destructive">{errors.billingCity.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingState">State *</Label>
              <Input id="billingState" placeholder="Maharashtra" {...register('billingState')} />
              {errors.billingState && <p className="text-xs text-destructive">{errors.billingState.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingPincode">Pincode *</Label>
              <Input id="billingPincode" placeholder="400001" {...register('billingPincode')} />
              {errors.billingPincode && <p className="text-xs text-destructive">{errors.billingPincode.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Shipping Address</CardTitle>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameAddress}
                  onChange={(e) => setSameAddress(e.target.checked)}
                  className="rounded border-input"
                />
                Same as billing
              </label>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="shippingLine1">Address Line 1</Label>
              <Input id="shippingLine1" placeholder="123 Main Street" disabled={sameAddress} {...register('shippingLine1')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shippingCity">City</Label>
              <Input id="shippingCity" placeholder="Mumbai" disabled={sameAddress} {...register('shippingCity')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shippingState">State</Label>
              <Input id="shippingState" placeholder="Maharashtra" disabled={sameAddress} {...register('shippingState')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shippingPincode">Pincode</Label>
              <Input id="shippingPincode" placeholder="400001" disabled={sameAddress} {...register('shippingPincode')} />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea id="notes" placeholder="Additional notes about this customer..." rows={3} {...register('notes')} />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/customers')}>Cancel</Button>
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : isEdit ? 'Update Customer' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
