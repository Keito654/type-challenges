import path from 'path'
import fs from 'fs-extra'
import { loadQuizes, resolveInfo } from './list'
import { toPlaygroundUrl, toSolutionsShort, REPO, toSolutionsFull, toQuizREADME, toShareAnswer, toShareAnswerFull } from './toUrl'
import { Quiz } from './types'
import { supportedLocales, defaultLocale, t, SupportedLocale } from './locales'

function toCommentBlock(text: string) {
  return `/*\n${
    text
      .trim()
      .split('\n')
      .map(i => `  ${i}`)
      .join('\n')
  }\n*/\n\n`
}

function toDivier(text: string) {
  return `\n/* _____________ ${text} _____________ */\n`
}

function toInfoHeader(quiz: Quiz, locale: SupportedLocale) {
  const info = resolveInfo(quiz, locale)
  return `#${quiz.no} - ${info.title || ''}\n`
    + '-------\n'
    + `by ${info.author?.name} (@${info?.author?.github}) #${t(locale, `difficulty.${quiz.difficulty}`)} ${info?.tags?.map(i => `#${i}`).join(' ') || ''}\n\n`
    + `### ${t(locale, 'title.question')}\n\n`
}

function toLinks(quiz: Quiz, locale: SupportedLocale) {
  return '\n\n'
  + `> ${t(locale, 'link.view-on-github')}${toQuizREADME(quiz, locale, true)}`
}

function toFooter(quiz: Quiz, locale: SupportedLocale) {
  return '\n\n'
  + `> ${t(locale, 'link.share-solutions')}${toShareAnswer(quiz.no, locale)}\n`
  + `> ${t(locale, 'link.checkout-solutions')}${toSolutionsShort(quiz.no)}\n`
}

export async function build() {
  const quizes = await loadQuizes()
  const redirects: [string, string, number][] = []

  // redirect homepage to github repo
  redirects.push(['/', REPO, 302])

  for (const quiz of quizes) {
    for (const locale of supportedLocales) {
      /* eslint-disable prefer-template */

      const code
      = toCommentBlock(
        toInfoHeader(quiz, locale)
        + (quiz.readme[locale] || quiz.readme[defaultLocale])
        + toLinks(quiz, locale),
      )
      + toDivier(t(locale, 'divider.code-start'))
      + '\n'
      + (quiz.template || '').trim()
      + '\n\n'
      + toDivier(t(locale, 'divider.test-cases'))
      + (quiz.tests || '')
      + '\n\n'
      + toDivier(t(locale, 'divider.further-steps'))
      + toCommentBlock(toFooter(quiz, locale))

      /* eslint-enable prefer-template */

      const url = toPlaygroundUrl(code)

      if (locale === defaultLocale) {
        redirects.push([`/case/${quiz.no}/play`, url, 302])
        redirects.push([`/case/${quiz.no}/answer`, toShareAnswerFull(quiz), 302])
      }
      else {
        redirects.push([`/case/${quiz.no}/play/${locale}`, url, 302])
        redirects.push([`/case/${quiz.no}/answer/${locale}`, toShareAnswerFull(quiz, locale), 302])
      }
    }

    redirects.push([`/case/${quiz.no}/solutions`, toSolutionsFull(quiz.no), 302])
  }

  const dist = path.resolve(__dirname, 'dist')

  await fs.remove(dist)
  await fs.ensureDir(dist)

  await fs.writeFileSync(path.join(dist, '_redirects'), redirects.map(i => i.join('\t')).join('\n'), 'utf-8')
}

build()