import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LANGUAGES, type Language } from "./index.ts";

// Every language has the same texts (with the plural forms its grammar needs), and every text the code
// asks for exists. Catches forgotten translations in CI.

type Tree = { [key: string]: string | Tree }

const locales = Object.fromEntries(
    (Object.keys(LANGUAGES) as Language[]).map((code) => [code, JSON.parse(readFileSync(join(import.meta.dirname, "locales", `${code}.json`), "utf8")) as Tree]),
) as Record<Language, Tree>

function flatten(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`))
}

const PLURAL_SUFFIX = /_(ordinal_)?(zero|one|two|few|many|other)$/

// "members.count_one" → "members.count"; plural forms are checked separately.
const baseKeys = (code: Language) => new Set(flatten(locales[code]).map((k) => k.replace(PLURAL_SUFFIX, "")))

describe("translations", () => {
  const codes = Object.keys(LANGUAGES) as Language[]

  it.each(codes)("%s has exactly the same texts as English", (code) => {
    const english = [...baseKeys("en")].sort()
    expect([...baseKeys(code)].sort()).toEqual(english)
  })

  it.each(codes)("%s has every plural form its grammar needs", (code) => {
    const keys = flatten(locales[code])
    const locale = LANGUAGES[code].locale
    const cardinal = new Intl.PluralRules(locale).resolvedOptions().pluralCategories
    const ordinal = new Intl.PluralRules(locale, { type: "ordinal" }).resolvedOptions().pluralCategories
    const plurals = new Set(keys.filter((k) => PLURAL_SUFFIX.test(k)).map((k) => k.replace(PLURAL_SUFFIX, "")))
    for (const base of plurals) {
      const isOrdinal = keys.some((k) => k.startsWith(`${base}_ordinal_`))
      for (const category of isOrdinal ? ordinal : cardinal) {
        expect(keys, `${code}: ${base}`).toContain(isOrdinal ? `${base}_ordinal_${category}` : `${base}_${category}`)
      }
    }
  })

  it("has every text the code uses", () => {
    const sourceFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      return statSync(path).isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(name) && !name.endsWith(".test.ts") ? [path] : []
    })
    const used = new Set<string>()
    for (const file of sourceFiles(join(import.meta.dirname, ".."))) {
      const source = readFileSync(file, "utf8")
      for (const match of source.matchAll(/(?:\bt|i18n\.t)\("([\w.]+)"|i18nKey="([\w.]+)"|"((?:week|repeat\.weekly|repeat\.monthly)\.[\w]+)"/g)) {
        used.add(match[1] ?? match[2] ?? match[3])
      }
    }
    const english = baseKeys("en")
    const missing = [...used].filter((key) => !english.has(key) && !english.has(`${key}.1`))
    expect(missing).toEqual([])
  })
})
