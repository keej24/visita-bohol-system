import { ChurchInfo } from './types';

interface Props {
  initialData: ChurchInfo;
  onSave: (data: ChurchInfo) => void;
  onSubmit: (data: ChurchInfo) => void;
  onCancel: () => void;
  currentStatus?: string;
  isSubmitting?: boolean;
}

export function ChurchProfileForm({
  initialData,
  onSave,
  onSubmit,
  onCancel,
  currentStatus,
  isSubmitting
}: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 my-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Church Profile</h2>
            {currentStatus && (
              <span className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${
                currentStatus === 'approved' ? 'bg-green-100 text-green-800' :
                currentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                Status: {currentStatus}
              </span>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto px-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Church Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700 font-medium">Church Name:</p>
                <p className="text-blue-900">{initialData.churchName || 'Not set'}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Parish Name:</p>
                <p className="text-blue-900">{initialData.parishName || 'Not set'}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Municipality:</p>
                <p className="text-blue-900">{initialData.locationDetails?.municipality || 'Not set'}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Barangay:</p>
                <p className="text-blue-900">{initialData.locationDetails?.barangay || 'Not set'}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Founding Year:</p>
                <p className="text-blue-900">{initialData.historicalDetails?.foundingYear || 'Not set'}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Architectural Style:</p>
                <p className="text-blue-900">{initialData.historicalDetails?.architecturalStyle || 'Not set'}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Heritage Classification:</p>
                <p className="text-blue-900">{initialData.historicalDetails?.heritageClassification || 'Not set'}</p>
              </div>
              <div>
                <p className="text-blue-700 font-medium">Parish Priest:</p>
                <p className="text-blue-900">{initialData.currentParishPriest || 'Not set'}</p>
              </div>
            </div>

            {initialData.historicalDetails?.historicalBackground && (
              <div className="mt-4">
                <p className="text-blue-700 font-medium">Historical Background:</p>
                <p className="text-blue-900 mt-1">{initialData.historicalDetails.historicalBackground}</p>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              <strong>Note:</strong> Full church profile editing form is under development.
              Currently displaying read-only information.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
            disabled={isSubmitting}
          >
            Close
          </button>
          <button
            onClick={() => onSave(initialData)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => onSubmit(initialData)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
