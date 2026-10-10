import React, { useState } from 'react';
import { api } from '../api/client';
import { ReportCategory } from '../types';
import { Camera, MapPin, AlertCircle, CheckCircle, ShieldAlert, Cpu } from 'lucide-react';

interface ReportWasteViewProps {
  onReportSubmitted: () => void;
}

export const ReportWasteView: React.FC<ReportWasteViewProps> = ({ onReportSubmitted }) => {
  const [category, setCategory] = useState<ReportCategory>('garbage_dump');
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('Near Ajmal Khan Road Market, Karol Bagh');
  const [lat, setLat] = useState<number>(28.653);
  const [lng, setLng] = useState<number>(77.1915);
  const [photoPath, setPhotoPath] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any | null>(null);

  // Detect GPS
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Number(pos.coords.latitude.toFixed(6)));
        setLng(Number(pos.coords.longitude.toFixed(6)));
        setAddressText(`Detected GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
      },
      () => {
        setErrorMessage('Unable to retrieve your location. Please enter coordinates manually.');
      }
    );
  };

  // Upload file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image exceeds maximum allowed size of 5 MB.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    try {
      const res = await api.uploadPhoto(file);
      setPhotoPath(res.photo_path);
      setPhotoPreview(URL.createObjectURL(file));
    } catch (err: any) {
      setErrorMessage(err.message || 'Photo upload failed. Magic-byte verification failed or corrupted file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMessage('Please provide a description of the issue.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const created = await api.createReport({
        category,
        description,
        lat,
        lng,
        address_text: addressText,
        photo_path: photoPath || 'default_report.jpg'
      });
      setSuccessInfo(created);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successInfo) {
    return (
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-emerald-200 shadow-sm text-left">
        <div className="flex items-center space-x-3 text-emerald-700 mb-4">
          <CheckCircle className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-bold">Report Filed Successfully</h2>
            <p className="text-sm text-emerald-600">Ticket Number: #{successInfo.ticket_number}</p>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs space-y-2 mb-6">
          <div className="flex justify-between">
            <span className="text-slate-500">Initial Status:</span>
            <span className="font-semibold uppercase text-amber-700">{successInfo.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">AI Inferred Waste Type:</span>
            <span className="font-semibold text-slate-800 capitalize">{successInfo.waste_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Priority Score (Explainable):</span>
            <span className="font-bold text-slate-900">{successInfo.priority_score} / 15</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Classification Source:</span>
            <span className="font-mono text-slate-700">{successInfo.source}</span>
          </div>
          {successInfo.cluster_id && (
            <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-900 mt-2">
              <ShieldAlert className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
              <strong>Duplicate Corroboration:</strong> Linked to existing neighbourhood cluster #{successInfo.cluster_id}. Urgency boosted.
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => {
              setSuccessInfo(null);
              setDescription('');
              setPhotoPreview(null);
              setPhotoPath('');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
          >
            File Another Report
          </button>
          <button
            onClick={onReportSubmitted}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
          >
            View on Civic Map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-left">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">File Civic Cleanliness Report</h2>
        <p className="text-xs text-slate-500 mt-1">
          Every report undergoes transparent keyword-and-category heuristic analysis, GPS clustering, and explainable multi-factor scoring.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {/* Category Picker */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">Select Incident Category</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { id: 'garbage_dump', label: 'Garbage Dump / Pile' },
              { id: 'overflowing_bin', label: 'Overflowing Bin' },
              { id: 'drain_clog', label: 'Choked Drain / Gutter' },
              { id: 'plastic_waste', label: 'Single-Use Plastic Litter' },
              { id: 'hazardous_waste', label: 'Hazardous / Chemical Waste' },
              { id: 'dead_animal', label: 'Dead Animal' }
            ].map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategory(cat.id as ReportCategory)}
                className={`p-2.5 rounded-lg border text-left font-medium transition ${
                  category === cat.id
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">Incident Description & Context</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Broken cardboard boxes, rotting vegetables, and polythene dumped near metro station gate 2."
            className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none text-base md:text-xs"
          />
          <div className="flex items-center space-x-1.5 text-slate-400 mt-1 text-[11px]">
            <Cpu className="w-3.5 h-3.5 text-blue-500" />
            <span>AI classifier will extract waste types (organic, plastic, paper, e-waste) and overflow condition.</span>
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">Incident Geolocation</span>
            <button
              type="button"
              onClick={handleDetectLocation}
              className="flex items-center space-x-1 text-emerald-700 font-semibold hover:underline"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Detect My Location</span>
            </button>
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Landmark / Address</label>
            <input
              type="text"
              value={addressText}
              onChange={(e) => setAddressText(e.target.value)}
              className="w-full p-2 border border-slate-300 rounded bg-white text-base md:text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded bg-white text-base md:text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded bg-white text-base md:text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">Site Photographic Proof</label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center space-x-2 px-4 py-2.5 min-h-[44px] border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition text-slate-700 bg-slate-50/50">
              <Camera className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="font-medium text-xs">
                {isUploading ? 'Validating Magic Bytes...' : 'Take Photo or Choose File (Max 5MB)'}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
            </label>
            {photoPath && (
              <span className="text-emerald-700 font-medium text-xs flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                Image sanitized & EXIF GPS stripped
              </span>
            )}
          </div>

          {photoPreview && (
            <div className="mt-3">
              <img
                src={photoPreview}
                alt="Upload Preview"
                className="w-40 h-32 object-cover rounded-xl border border-slate-300 shadow-sm"
              />
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2 sticky bottom-0 bg-white/95 backdrop-blur-sm py-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="w-full sm:w-auto px-6 py-3 min-h-[48px] bg-emerald-600 hover:bg-emerald-500 font-bold text-white rounded-xl text-sm transition shadow-lg disabled:opacity-60 cursor-pointer flex items-center justify-center space-x-2"
          >
            {isSubmitting ? 'Processing AI & Spatial Clusters...' : 'Submit Citizen Report'}
          </button>
        </div>
      </form>
    </div>
  );
};
