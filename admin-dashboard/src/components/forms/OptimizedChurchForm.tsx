import React, { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { 
  churchValidationSchema,
  ChurchFormData,
  useOptimisticForm
} from '@/lib/forms/validation';
import { queryKeys } from '@/lib/data-management/queryClient';
import { 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  Save, 
  Loader2, 
  CheckCircle,
  AlertTriangle,
  Upload,
  X,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Form props interface
export interface OptimizedChurchFormProps {
  initialData?: Partial<ChurchFormData>;
  churchId?: string;
  mode: 'create' | 'edit';
  diocese: string;
  onSuccess?: (data: ChurchFormData) => void;
  onCancel?: () => void;
  className?: string;
}

// Mock submission function - replace with actual API call
const submitChurchData = async (data: ChurchFormData): Promise<{ success: boolean; message: string; data?: ChurchFormData }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate occasional errors for testing
  if (Math.random() < 0.1) {
    throw new Error('Network error. Please try again.');
  }
  
  return { id: 'mock-id', ...data };
};

export const OptimizedChurchForm: React.FC<OptimizedChurchFormProps> = ({
  initialData,
  churchId,
  mode,
  diocese,
  onSuccess,
  onCancel,
  className,
}) => {
  const {
    form,
    handleSubmit,
    isSubmitting,
    isSuccess,
    error,
    submitAttempts,
    validateField,
    enableAutoSave,
    cleanup,
    reset,
  } = useOptimisticForm(
    churchValidationSchema,
    {
      mutationFn: submitChurchData,
      successMessage: mode === 'create' 
        ? 'Church created successfully!' 
        : 'Church updated successfully!',
      errorMessage: 'Failed to save church data',
      queryKeysToInvalidate: [
        queryKeys.churches.diocese(diocese),
        queryKeys.churches.all(),
      ],
      enableOptimisticUpdates: true,
      onSuccess: (result, data) => {
        onSuccess?.(data);
        if (mode === 'create') {
          reset();
        }
      },
      retryAttempts: 2,
      debounceMs: 500,
    },
    {
      defaultValues: {
        diocese: diocese as 'tagbilaran' | 'talibon',
        province: 'Bohol',
        heritageClassification: 'none',
        condition: 'good',
        facilities: [],
        ...initialData,
      },
    }
  );

  // Enable auto-save for edit mode
  useEffect(() => {
    if (mode === 'edit') {
      const cleanup = enableAutoSave(30000); // Auto-save every 30 seconds
      return cleanup;
    }
  }, [mode, enableAutoSave]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const facilities = [
    'Parking', 'Restrooms', 'Gift Shop', 'Museum', 'Library', 
    'Conference Room', 'Wedding Chapel', 'Cemetery', 'Garden', 'Bell Tower'
  ];

  const architecturalStyles = [
    'Baroque', 'Gothic', 'Romanesque', 'Neo-classical', 'Modern', 
    'Contemporary', 'Spanish Colonial', 'Filipino Indigenous', 'Mixed'
  ];

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="h-5 w-5" />
                  <span>
                    {mode === 'create' ? 'Add New Church' : 'Edit Church'}
                  </span>
                </CardTitle>
                
                <div className="flex items-center space-x-2">
                  {isSuccess && (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Saved
                    </Badge>
                  )}
                  
                  {error && (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                  )}
                  
                  {form.formState.isDirty && !isSubmitting && (
                    <Badge variant="outline">
                      <Info className="h-3 w-3 mr-1" />
                      Unsaved changes
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Church Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., San Pedro Apostol Church"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            validateField('name', 500);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="municipality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Municipality *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Loboc"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            validateField('municipality', 500);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="diocese"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diocese *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select diocese" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="tagbilaran">Tagbilaran</SelectItem>
                          <SelectItem value="talibon">Talibon</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Province</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormDescription>
                        All churches in the system are in Bohol
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Complete address including barangay, street, etc."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Historical Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Historical Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="yearBuilt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year Built</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="e.g., 1877"
                          {...field}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="architect"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Architect</FormLabel>
                      <FormControl>
                        <Input placeholder="Architect name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="architecturalStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Architectural Style</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select style" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {architecturalStyles.map((style) => (
                            <SelectItem key={style} value={style.toLowerCase()}>
                              {style}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="historicalSignificance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Historical Significance</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the historical importance of this church..."
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length || 0}/2000 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="heritageClassification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heritage Classification</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select classification" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="ICP">
                          Important Cultural Property (ICP)
                        </SelectItem>
                        <SelectItem value="NCT">
                          National Cultural Treasure (NCT)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Contact & Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="h-5 w-5" />
                <span>Contact & Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pastor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pastor/Parish Priest</FormLabel>
                      <FormControl>
                        <Input placeholder="Fr. Juan Dela Cruz" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+63 912 345 6789"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            validateField('contactPhone', 1000);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="parish@church.ph"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            validateField('contactEmail', 1000);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Condition</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="massSchedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mass Schedule</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Sunday: 6:00 AM, 8:00 AM, 10:00 AM&#10;Weekdays: 6:00 AM"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length || 0}/500 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Facilities */}
          <Card>
            <CardHeader>
              <CardTitle>Facilities & Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="facilities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Facilities</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {facilities.map((facility) => (
                        <FormItem
                          key={facility}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(facility)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, facility]);
                                } else {
                                  field.onChange(current.filter((f) => f !== facility));
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {facility}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Form Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  {submitAttempts > 0 && (
                    <span>Attempt {submitAttempts}/3</span>
                  )}
                  {form.formState.isDirty && (
                    <Badge variant="outline">Unsaved changes</Badge>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {onCancel && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onCancel}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reset()}
                    disabled={isSubmitting || !form.formState.isDirty}
                  >
                    Reset
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !form.formState.isValid}
                    className="min-w-[120px]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {mode === 'create' ? 'Create Church' : 'Update Church'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
};
