import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { RecyclableListing, PickupRequest } from '../types';
import { Recycle, PlusCircle, CheckCircle2, AlertCircle, RefreshCw, DollarSign, Calendar } from 'lucide-react';

export const RecycleConnectView: React.FC = () => {
  const [listings, setListings] = useState<RecyclableListing[]>([]);
  const [rateCard, setRateCard] = useState<any | null>(null);
  const [recyclers, setRecyclers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New listing state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [materialType, setMaterialType] = useState('paper_cardboard');
  const [estimatedWeightKg, setEstimatedWeightKg] = useState(10);
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('B-12, Karol Bagh Market Road');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [lData, rData, recList] = await Promise.all([
        api.getListings(),
        api.getRateCard(),
        api.getRecyclers()
      ]);
      setListings(lData);
      setRateCard(rData);
      setRecyclers(recList);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch RecycleConnect data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await api.createListing({
        material_type: materialType,
        estimated_weight_kg: Number(estimatedWeightKg),
        description,
        address_text: addressText,
        lat: 28.6525,
        lng: 77.191
      });
      setShowCreateModal(false);
      setDescription('');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to publish recyclable listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">RecycleConnect — Circular Economy Exchange</h2>
          <p className="text-xs text-slate-500">
            Divert dry segregables directly from landfills to authorized recyclers with doorstep weighing and pickup.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List Recyclable Scrap</span>
          </button>
          <button
            onClick={fetchData}
            className="p-1.5 border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-600"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Indicative Rate Card */}
      {rateCard && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Indicative Benchmark Rates</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-medium text-[10px] border border-amber-200">
              {rateCard.rate_disclaimer || 'indicative, not market data'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Paper & Cardboard', rate: rateCard.paper_cardboard || 12 },
              { label: 'PET Bottles', rate: rateCard.plastic_pet || 18 },
              { label: 'Scrap Metal', rate: rateCard.metal_scrap || 32 },
              { label: 'E-Waste Items', rate: rateCard.e_waste || 45 },
              { label: 'Glass Bottles', rate: rateCard.glass || 4 }
            ].map((item, idx) => (
              <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-slate-500 block text-[11px]">{item.label}</span>
                <span className="font-bold text-emerald-800 text-sm">₹{item.rate} / kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 text-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">List Dry Recyclables for Pickup</h3>
            <form onSubmit={handleCreateListing} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Material Type</label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                >
                  <option value="paper_cardboard">Paper & Cardboard Boxes</option>
                  <option value="plastic_pet">PET Plastic Bottles</option>
                  <option value="metal_scrap">Scrap Metal & Cans</option>
                  <option value="e_waste">E-Waste / Electronics</option>
                  <option value="glass">Glass Containers</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Estimated Weight (kg)</label>
                <input
                  type="number"
                  min="1"
                  value={estimatedWeightKg}
                  onChange={(e) => setEstimatedWeightKg(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 5 carton boxes of unsoiled office paper"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Pickup Address</label>
                <input
                  type="text"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-emerald-700 text-white rounded font-bold hover:bg-emerald-800 disabled:opacity-50"
                >
                  {isSubmitting ? 'Listing...' : 'Publish Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Listings Grid */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-900 text-sm">Active Recyclable Listings ({listings.length})</h3>
        {loading && <div className="text-center p-6 text-slate-400 text-xs">Loading listings...</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {listings.map((l) => (
            <div key={l.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-900 capitalize">
                  {l.material_type.replace('_', ' ')}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                  {l.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-slate-600">{l.description || 'Dry recyclable material'}</p>
              <div className="flex items-center justify-between text-slate-500 pt-1">
                <span>Estimated: <strong>{l.estimated_weight_kg} kg</strong></span>
                <span>{l.address_text || 'Delhi-NCR'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
