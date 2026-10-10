export type Language = 'en' | 'hi' | 'gu';

const LANGUAGE_KEY = 'cleanbharat_language';

export const getStoredLanguage = (): Language => {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored === 'hi' || stored === 'gu' || stored === 'en') {
    return stored;
  }
  return 'en';
};

export const setStoredLanguage = (lang: Language) => {
  localStorage.setItem(LANGUAGE_KEY, lang);
};

export const translations = {
  en: {
    appTitle: "SmartRoute AI — Clean Bharat",
    appSubtitle: "AI First Municipal Intelligence Platform",
    nav: {
      map: "Civic Map",
      report: "Report Waste",
      myReports: "My Reports",
      routes: "Route Optimiser",
      verification: "Verification Queue",
      workerTasks: "Field Tasks",
      drainGuard: "DrainGuard",
      recycle: "RecycleConnect",
      quiz: "Segregation Quiz",
      events: "Community Cleanups",
      commandCenter: "Command Centre",
      impact: "Impact Analytics",
      admin: "Admin & Settings",
      assistant: "Ask Assistant",
      judgeMode: "Judge Mode"
    },
    common: {
      loading: "Loading data from server...",
      error: "Error encountered",
      retry: "Retry",
      empty: "No records found matching criteria",
      save: "Save",
      submit: "Submit",
      cancel: "Cancel",
      search: "Search...",
      filter: "Filter",
      status: "Status",
      category: "Category",
      priority: "Priority Score",
      ward: "Ward",
      actions: "Actions",
      simulatedBadge: "Simulated Telemetry",
      fallbackBadge: "Rules Fallback",
      indicativePrice: "Indicative, not market data",
      switchRole: "Role:"
    },
    report: {
      title: "File Civic Cleanliness Report",
      subtitle: "Photo, category, and geolocation feed directly into automated priority scoring and duplicate clustering.",
      categoryLabel: "Incident Category",
      descriptionLabel: "Description & Details",
      addressLabel: "Location Address",
      useGps: "Detect My GPS Location",
      manualGps: "Manual Coordinates",
      uploadPhoto: "Upload Real-site Photo (Max 5MB)",
      photoNote: "EXIF GPS metadata will be stripped automatically for privacy.",
      submitBtn: "Submit Citizen Report"
    },
    routing: {
      title: "Capacitated Fleet Route Optimisation",
      subtitle: "Multi-vehicle CVRP solver minimizing distance, fuel expenditure, and carbon emissions.",
      depot: "Depot Garage",
      vehicle: "Collection Vehicle",
      selectReports: "Select Pending Incidents to Collect",
      optimizeBtn: "Compute Optimised Route",
      baselineDist: "Baseline (Unoptimised) Distance",
      optimisedDist: "Optimised Distance",
      distanceSaved: "Distance Saved",
      efficiencyGain: "Fuel / Route Efficiency Gain"
    }
  },
  hi: {
    appTitle: "स्मार्टरूट एआई — स्वच्छ भारत",
    appSubtitle: "एआई फर्स्ट नगरपालिका स्वच्छता मंच",
    nav: {
      map: "नागरिक मानचित्र",
      report: "शिकायत दर्ज करें",
      myReports: "मेरी शिकायतें",
      routes: "मार्ग अनुकूलन",
      verification: "सत्यापन कतार",
      workerTasks: "कार्य सूची",
      drainGuard: "ड्रेनगार्ड",
      recycle: "रीसायकल कनेक्ट",
      quiz: "कचरा पृथक्करण प्रश्नोत्तरी",
      events: "सामुदायिक सफाई",
      commandCenter: "कमांड सेंटर",
      impact: "पर्यावरण प्रभाव",
      admin: "प्रशासन",
      assistant: "सहायक से पूछें",
      judgeMode: "जज वॉकथ्रू"
    },
    common: {
      loading: "डेटा लोड हो रहा है...",
      error: "त्रुटि आई",
      retry: "पुनः प्रयास करें",
      empty: "कोई रिकॉर्ड नहीं मिला",
      save: "सुरक्षित करें",
      submit: "जमा करें",
      cancel: "रद्द करें",
      search: "खोजें...",
      filter: "फ़िल्टर",
      status: "स्थिति",
      category: "श्रेणी",
      priority: "प्राथमिकता स्कोर",
      ward: "वार्ड",
      actions: "कार्रवाई",
      simulatedBadge: "सिम्युलेटेड डेटा",
      fallbackBadge: "पारदर्शी नियम आधारित",
      indicativePrice: "संकेतात्मक दर (बाजार दर नहीं)",
      switchRole: "भूमिका:"
    },
    report: {
      title: "नागरिक स्वच्छता शिकायत दर्ज करें",
      subtitle: "फोटो, श्रेणी और स्थान सीधे प्राथमिकता स्कोरिंग प्रणाली में दर्ज होते हैं।",
      categoryLabel: "कचरा श्रेणी",
      descriptionLabel: "विवरण",
      addressLabel: "पता",
      useGps: "मेरा स्थान पहचानें",
      manualGps: "मैनुअल निर्देशांक",
      uploadPhoto: "साइट फोटो अपलोड करें (अधिकतम 5MB)",
      photoNote: "नागरिक गोपनीयता हेतु EXIF GPS स्वचालित रूप से हटा दिया जाता है।",
      submitBtn: "शिकायत दर्ज करें"
    },
    routing: {
      title: "वाहन मार्ग अनुकूलन",
      subtitle: "दूरी, ईंधन और उत्सर्जन को कम करने वाला अनुकूलित रूट सॉल्वर।",
      depot: "डिपो",
      vehicle: "सफाई वाहन",
      selectReports: "कचरा बिंदुओं का चयन करें",
      optimizeBtn: "अनुकूलित मार्ग बनाएं",
      baselineDist: "मूल दूरी",
      optimisedDist: "अनुकूलित दूरी",
      distanceSaved: "बची हुई दूरी",
      efficiencyGain: "ईंधन दक्षता सुधार"
    }
  },
  gu: {
    appTitle: "સ્માર્ટરૂટ એઆઈ — સ્વચ્છ ભારત",
    appSubtitle: "મ્યુનિસિપલ ઇન્ટેલિજન્સ પ્લેટફોર્મ",
    nav: {
      map: "નાગરિક નકશો",
      report: "કચરાની ફરિયાદ",
      myReports: "મારી ફરિયાદો",
      routes: "રૂટ ઓપ્ટિમાઇઝર",
      verification: "ચકાસણી",
      workerTasks: "કાર્ય સૂચિ",
      drainGuard: "ડ્રેનગાર્ડ",
      recycle: "રીસાયકલ કનેક્ટ",
      quiz: "કચરો અલગ કરવાની ક્વિઝ",
      events: "સામૂહિક સફાઈ",
      commandCenter: "કમાન્ડ સેન્ટર",
      impact: "પર્યાવરણ પ્રભાવ",
      admin: "વહીવટ",
      assistant: "સહાયક પૂછો",
      judgeMode: "જજ મોડ"
    },
    common: {
      loading: "લોડ થઈ રહ્યું છે...",
      error: "ભૂલ આવી",
      retry: "ફરી પ્રયાસ કરો",
      empty: "કોઈ રેકોર્ડ મળ્યો નથી",
      save: "સાચવો",
      submit: "સબમિટ કરો",
      cancel: "રદ કરો",
      search: "શોધો...",
      filter: "ફિલ્ટર",
      status: "સ્થિતિ",
      category: "શ્રેણી",
      priority: "પ્રાધાન્ય સ્કોર",
      ward: "વોર્ડ",
      actions: "ક્રિયાઓ",
      simulatedBadge: "સિમ્યુલેટેડ",
      fallbackBadge: "નિયમ આધારિત",
      indicativePrice: "સૂચક ભાવ",
      switchRole: "રોલ:"
    },
    report: {
      title: "સ્વચ્છતા ફરિયાદ નોંધાવો",
      subtitle: "ફોટો, કેટેગરી અને લોકેશન સીધા પ્રાયોરિટી સ્કોરિંગમાં જાય છે.",
      categoryLabel: "શ્રેણી",
      descriptionLabel: "વિગતો",
      addressLabel: "સરનામું",
      useGps: "મારું લોકેશન શોધો",
      manualGps: "મેન્યુઅલ કોઓર્ડિનેટ્સ",
      uploadPhoto: "ફોટો અપલોડ કરો (મહત્તમ 5MB)",
      photoNote: "EXIF GPS આપમેળે દૂર કરવામાં આવે છે.",
      submitBtn: "ફરિયાદ સબમિટ કરો"
    },
    routing: {
      title: "વાહન રૂટ ઓપ્ટિમાઇઝેશન",
      subtitle: "અંતર અને ઇંધણ બચાવવા માટેનો સ્માર્ટ રૂટ સોલ્વર.",
      depot: "ડેપો",
      vehicle: "વાહન",
      selectReports: "કચરાના સ્થળો પસંદ કરો",
      optimizeBtn: "ઓપ્ટિમાઇઝ કરો",
      baselineDist: "મૂળ અંતર",
      optimisedDist: "ઓપ્ટિમાઇઝ અંતર",
      distanceSaved: "બચેલું અંતર",
      efficiencyGain: "કાર્યક્ષમતા સુધારો"
    }
  }
};
