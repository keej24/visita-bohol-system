interface Props {
  images: string[];
}

export default function VirtualTour360({ images }: Props) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">360° Virtual Tour</h3>
      <p className="text-gray-600">Virtual tour viewer - Under development</p>
      {images && images.length > 0 && (
        <p className="text-sm text-gray-500 mt-2">{images.length} images available</p>
      )}
    </div>
  );
}
