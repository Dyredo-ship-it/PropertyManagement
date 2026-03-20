import React, { useState, useEffect } from "react";
import { getBuildings, getTenants } from "../utils/storage";
import { Plus, X, Calendar, MapPin, Users, CheckCircle, Clock } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

export function InterventionsView() {
  const { t } = useLanguage();
  const [interventions, setInterventions] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  // Form
  const [buildingId, setBuildingId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [presenceRequired, setPresenceRequired] = useState(true);
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);

  useEffect(() => {
    setBuildings(getBuildings());
    setTenants(getTenants());
    // Load interventions from storage (mocked for now)
    const stored = localStorage.getItem("interventions");
    if (stored) setInterventions(JSON.parse(stored));
  }, []);

  const handleCreate = () => {
    if (!buildingId || !date || !description) return;

    const newIntervention = {
      id: `int-${Date.now()}`,
      buildingId,
      date,
      time,
      description,
      presenceRequired,
      tenantResponses: selectedTenants.map(id => ({ tenantId: id, status: 'pending' })),
      createdAt: new Date().toISOString()
    };

    const updated = [newIntervention, ...interventions];
    setInterventions(updated);
    localStorage.setItem("interventions", JSON.stringify(updated));
    setShowModal(false);

    // Reset
    setBuildingId("");
    setDate("");
    setTime("");
    setDescription("");
    setPresenceRequired(true);
    setSelectedTenants([]);
  };

  const getBuildingName = (id: string) => buildings.find(b => b.id === id)?.name || "N/A";
  const getTenantName = (id: string) => tenants.find(t => t.id === id)?.name || "Inconnu";

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl mb-2 text-[#171414]">{t("interventionsTitle")}</h1>
          <p className="text-[#6B6560]">{t("interventionsSub")}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#45553A] text-white font-medium hover:bg-[#3a4930] transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t("newIntervention")}
        </button>
      </div>

      <div className="space-y-4">
        {interventions.length === 0 ? (
          <div className="p-8 text-center border border-[#E8E5DB] rounded-2xl bg-white shadow-sm">
            <p className="text-[#6B6560]">{t("noInterventions")}</p>
          </div>
        ) : (
          interventions.map(int => (
            <div key={int.id} className="p-6 rounded-2xl border border-[#E8E5DB] bg-white shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#171414]">{int.description}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-[#6B6560]">
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> {getBuildingName(int.buildingId)}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4"/> {new Date(int.date).toLocaleDateString('fr-CH')} {t("time")} {int.time}</span>
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                  {int.presenceRequired ? t("tenantPresenceRequired") : t("infoOnly")}
                </div>
              </div>

              {int.presenceRequired && int.tenantResponses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#E8E5DB]">
                  <h4 className="text-sm font-medium text-[#171414] mb-3">{t("tenantResponses")}</h4>
                  <div className="space-y-2">
                    {int.tenantResponses.map((r: any) => (
                      <div key={r.tenantId} className="flex justify-between items-center text-sm">
                        <span className="text-[#6B6560]">{getTenantName(r.tenantId)}</span>
                        <span className={`px-2 py-1 rounded-md text-xs ${
                          r.status === 'present' ? 'bg-green-100 text-green-700' :
                          r.status === 'absent' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {r.status === 'present' ? t("present") : r.status === 'absent' ? t("absent") : t("pending")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg rounded-3xl border border-[#E8E5DB] bg-white p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-[#171414]">{t("planIntervention")}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#6B6560] hover:text-[#171414]"><X className="w-5 h-5"/></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#171414] mb-1">{t("building")}</label>
                <select value={buildingId} onChange={e => setBuildingId(e.target.value)} className="w-full bg-[#FAF5F2] border border-[#E8E5DB] rounded-xl px-4 py-2 text-[#171414]">
                  <option value="">{t("selectABuilding")}</option>
                  {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {buildingId && (
                <div>
                  <label className="block text-sm text-[#171414] mb-1">{t("concernedTenants")}</label>
                  <div className="max-h-32 overflow-y-auto bg-[#FAF5F2] border border-[#E8E5DB] rounded-xl p-2">
                    {tenants.filter(tn => tn.buildingId === buildingId).map(tn => (
                      <label key={tn.id} className="flex items-center gap-2 p-2 hover:bg-[#E8E5DB]/50 rounded-lg cursor-pointer">
                        <input type="checkbox" checked={selectedTenants.includes(tn.id)} onChange={(e) => {
                          if (e.target.checked) setSelectedTenants([...selectedTenants, tn.id]);
                          else setSelectedTenants(selectedTenants.filter(id => id !== tn.id));
                        }} />
                        <span className="text-sm text-[#171414]">{tn.name} ({t("units")} {tn.unit})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#171414] mb-1">{t("date")}</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#FAF5F2] border border-[#E8E5DB] rounded-xl px-4 py-2 text-[#171414]" />
                </div>
                <div>
                  <label className="block text-sm text-[#171414] mb-1">{t("time")}</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-[#FAF5F2] border border-[#E8E5DB] rounded-xl px-4 py-2 text-[#171414]" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-[#171414] mb-1">{t("description")}</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#FAF5F2] border border-[#E8E5DB] rounded-xl px-4 py-2 text-[#171414] resize-none" rows={3} />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={presenceRequired} onChange={e => setPresenceRequired(e.target.checked)} />
                <span className="text-sm text-[#171414]">{t("presenceRequired")}</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 rounded-xl border border-[#E8E5DB] text-[#171414] hover:bg-[#E8E5DB]/50 transition-colors">{t("cancel")}</button>
              <button onClick={handleCreate} className="flex-1 py-2 rounded-xl bg-[#45553A] text-white font-medium hover:bg-[#3a4930] transition-colors">{t("create")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
