export const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧", greeting: "Hello!" },
  { code: "es", name: "Spanish", flag: "🇪🇸", greeting: "¡Hola!" },
  { code: "fr", name: "French", flag: "🇫🇷", greeting: "Bonjour !" },
  { code: "de", name: "German", flag: "🇩🇪", greeting: "Hallo!" },
  { code: "it", name: "Italian", flag: "🇮🇹", greeting: "Ciao!" },
  { code: "pt", name: "Portuguese", flag: "🇧🇷", greeting: "Olá!" },
  { code: "ja", name: "Japanese", flag: "🇯🇵", greeting: "こんにちは！" },
  { code: "ko", name: "Korean", flag: "🇰🇷", greeting: "안녕하세요!" },
  { code: "zh", name: "Mandarin", flag: "🇨🇳", greeting: "你好！" },
  { code: "ar", name: "Arabic", flag: "🇸🇦", greeting: "!مرحبا" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return LANGUAGES.some((language) => language.code === value);
}

export function getLanguage(code: string) {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}
