import i18n from "i18next"
import Backend from "i18next-http-backend"
import { initReactI18next } from "react-i18next"

import en from "./en"
import zhCN from "./zh-CN"

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en
      },
      "zh-CN": {
        translation: zhCN
      }
    },
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  })

export default i18n
