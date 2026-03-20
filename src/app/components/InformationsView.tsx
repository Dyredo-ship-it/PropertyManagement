import React from "react";
import { Card } from "./ui/card";
import { Info, FileText } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../i18n/LanguageContext";

export function InformationsView() {
  const { user } = useAuth();
  const { t } = useLanguage();

  if (user?.role === 'admin') {
    return (
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl mb-2 text-[#171414]">{t("informationsTitle")}</h1>
          <p className="text-[#6B6560]">
            {t("informationsSub")}
          </p>
        </div>

        <Card className="p-6 border border-[#E8E5DB] space-y-6 bg-white shadow-sm rounded-xl">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-[#45553A]/10">
              <Info className="w-6 h-6 text-[#45553A]" />
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-[#6B6560]">
              <p>
                <strong className="text-[#171414]">{t("referenceRate")}</strong><br />
                {t("referenceRateText")}
              </p>

              <p>
                <strong className="text-[#171414]">{t("cpiIndexation")}</strong><br />
                {t("cpiIndexationText")}
              </p>

              <p>
                <strong className="text-[#171414]">{t("maintenanceReserves")}</strong><br />
                {t("maintenanceReservesText")}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl mb-2 text-[#171414]">{t("infoTenantTitle")}</h1>
        <p className="text-[#6B6560]">
          {t("infoTenantSub")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 border border-[#E8E5DB] space-y-4 bg-white shadow-sm rounded-xl">
          <h2 className="text-xl font-semibold text-[#171414]">{t("regulations")}</h2>
          <ul className="space-y-3 text-[#6B6560]">
            <li className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#6B6560]" />
              <a href="#" className="hover:text-[#171414] transition-colors">{t("buildingRules")}</a>
            </li>
            <li className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#6B6560]" />
              <a href="#" className="hover:text-[#171414] transition-colors">{t("laundryRules")}</a>
            </li>
            <li className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#6B6560]" />
              <a href="#" className="hover:text-[#171414] transition-colors">{t("wasteRules")}</a>
            </li>
          </ul>
        </Card>

        <Card className="p-6 border border-[#E8E5DB] space-y-4 bg-white shadow-sm rounded-xl">
          <h2 className="text-xl font-semibold text-[#171414]">{t("usefulContacts")}</h2>
          <div className="space-y-4 text-[#6B6560]">
            <div>
              <p className="font-medium text-[#171414]">{t("managementEmergency")}</p>
              <p className="text-sm">022 123 45 67</p>
            </div>
            <div>
              <p className="font-medium text-[#171414]">{t("concierge")}</p>
              <p className="text-sm">M. Dupont - 079 123 45 67<br/>Pr\u00E9sent lu-ve 8h-12h</p>
            </div>
            <div>
              <p className="font-medium text-[#171414]">{t("medicalEmergency")}</p>
              <p className="text-sm">144</p>
            </div>
            <div>
              <p className="font-medium text-[#171414]">{t("police")}</p>
              <p className="text-sm">117</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
