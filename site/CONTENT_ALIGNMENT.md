# Thesis website content alignment

Canonical source: `paper/thesis/main.tex` and every file it includes.

The English thesis-facing narrative in `index.html` and the `en` object in
`src/js/i18n.js` now consists of direct extracts, close paraphrases, or compact
composites of the thesis text. Citations attached to quotations and named data
sources are retained. Website copy does not add a more cautious or more causal
interpretation than the manuscript.

## Residual text that necessarily differs

The following is the complete residual-divergence inventory. These differences
are necessary only to preserve the website's existing interface, accessibility,
bilingual presentation, interactive charts, and source attribution.

### Dutch locale

Every value in `translations.nl` is a Dutch translation of an English thesis
passage or of an interface string. The thesis is written in English, so all
Dutch values necessarily differ verbatim. They preserve the revised meaning and
claim strength of their English counterparts.

### Interface, navigation, and document metadata

These English keys are web controls, navigational summaries, or accessibility
labels rather than manuscript prose:

- `metaTitle`, `navAria`, `langAria`, `navMenuOpen`, `navMenuClose`,
  `navBrand`, `navTitle`
- `navSetting`, `navQuestion`, `navObserve`, `navIntensity`, `navCompare`,
  `navEstimates`, `navFragile`, `navRead`
- `heroBrand`, `heroBegin`, `heroPdf`, `heroFindingsAria`,
  `heroFindingsEyebrow`, `heroEstimateAria`, `heroEstimateNumber`,
  `heroEstimateUnit`, `heroEstimateLabel`, `heroEstimateQualifier`,
  `heroFemaleAria`, `heroFemaleLabel`, `heroSampleAria`, `heroSampleLabel`,
  `heroCaveatAria`, `heroCaveatLabel`
- `footerTitle`, `footerByline`, `footerPdf`, `footerTop`, `footerRefs`,
  `footerCiteNote`

Most navigation labels reuse thesis section titles. The residual divergence is
their shortened placement, author/site branding, button wording, or accessible
description.

### Section signposting and web-only structural text

These keys turn manuscript sections into a long-scroll web narrative. Their
wording is either a thesis heading, an extract, or a concise signpost, but their
placement and role do not exist in the manuscript:

- `settingEyebrow`, `settingH2`, `questionEyebrow`, `questionH2`
- `observeEyebrow`, `observeH2`, `intensityEyebrow`, `intensityH2`
- `compareEyebrow`, `compareH2`, `estimatesEyebrow`, `estimatesH2`
- `fragileEyebrow`, `fragileH2`, `readEyebrow`, `readH2`
- `schematicAria`, `schematicOutcome`, `schematicOutcomeBody`,
  `schematicExposure`, `schematicExposureBody`, `schematicHeld`,
  `schematicHeldBody`
- `methodsSummary`, `methodsP1`, `methodsP2`
- `statGapLabel`, `statFemaleLabel`, `statNLabel`
- `decompIntro`, `decompAria`, `decompFemaleBtn`, `decompMaleBtn`

The equation note (`methodsP1` and `methodsP2`) is a compact plain-text/Unicode
rendering of the two LaTeX equations and their sign convention; mathematical
content is unchanged.

### Interactive globe

The thesis discusses long and deadly VOC voyages and colonial extraction but
does not contain a route-by-route VOC/WIC atlas. The following keys therefore
use source-backed supplemental text required by the retained globe:

- `globeAlt`, `globeCaption`, `globeMetaWorld`, `globeMetaProjection`,
  `globeInstruction`, `globeFilterLabel`, `globeFilterAll`, `globeFilterVoc`,
  `globeFilterWic`, `globeRoutesLabel`, `globePause`, `globeResume`,
  `globeZoomIn`, `globeZoomOut`, `globeTypeCorridor`, `globeTypeVoyage`,
  `globePeriodLabel`, `globeStopsLabel`, `globeSourcesLabel`,
  `globeReconstruction`, `globeRegionalNote`, `globeEthics`
- `globeRouteVocMain`, `globeRouteVocMainDesc`, `globeRouteBatavia`,
  `globeRouteBataviaDesc`, `globeRouteJapan`, `globeRouteJapanDesc`,
  `globeRouteSpice`, `globeRouteSpiceDesc`, `globeRouteBrazil`,
  `globeRouteBrazilDesc`, `globeRouteAtlantic`, `globeRouteAtlanticDesc`,
  `globeRouteGideon`, `globeRouteGideonDesc`
- `globePeriodVocMain`, `globePeriodBatavia`, `globePeriodJapan`,
  `globePeriodSpice`, `globePeriodBrazil`, `globePeriodAtlantic`,
  `globePeriodGideon`
- `globePlaceTexel`, `globePlaceAmsterdam`, `globePlaceCape`,
  `globePlaceStPaul`, `globePlaceSunda`, `globePlaceBatavia`,
  `globePlaceAbrolhos`, `globePlaceFormosa`, `globePlaceDejima`,
  `globePlaceAmbon`, `globePlaceBanda`, `globePlaceRecife`,
  `globePlaceElmina`, `globePlaceCuracao`, `globePlaceSuriname`,
  `globePlaceWestAfrica`, `globePlaceNewAmsterdam`

`public/data/voyage-routes.json` also contains the displayed source institution
names and source titles. They reproduce external source metadata, not thesis
prose.

### Thesis-data visualisations

Chart titles, axes, legends, tooltips, alt text, and visual descriptions must
describe the website's visual encoding, which the prose manuscript does not do
word-for-word:

- Literacy chart: `gapAlt`, `gapX`, `gapY`, `gapMale`, `gapFemale`, `gap1600`,
  `gap1750`, `gapNote`, `gapTooltipGap`
- City map: `mapAlt`, `intensityLegend`, `mapLower`, `mapHigher`,
  `mapTooltipIntensity`
- Treatment histogram: `histAlt`, `histX`, `histY`, `histCities`,
  `histRotterdam`, `histTooltipCount`
- Event study: `eventAlt`, `esX`, `esY`, `esNote`, `esBase`, `esTooltipCoef`

The figure captions (`gapCaption`, `mapCaption`, `histCaption`, and
`eventCaption`) are direct paraphrases or composites of the thesis's figure
discussion. They diverge only by omitting LaTeX cross-references and by
describing the interactive rendering.

### Generated numbers and bibliography

`index.html` and the chart modules render figure numbering, year ranges,
numeric ticks/tooltips, and the thesis estimates `2.84`, `99.4%`, `32`,
`+11.30`, and `−0.07`. These are data/estimate labels rather than prose; their
values agree with the thesis and its generated tables.

`src/js/bibliography.js` formats the website's cited Akçomak et al. (2016),
Petram et al. (2024), and Schmidt (2025) entries as linked HTML. Bibliographic
formatting necessarily differs from `biblatex` source syntax, while the
underlying entries come from `paper/thesis/Thesis.bib`.

### Pure formatting differences

HTML emphasis tags, typographic apostrophes/quotation marks, en dashes,
non-breaking spaces, removal of LaTeX commands, conversion of citations to
author-year text, and omission of `\autoref` pointers are presentation changes
only. They do not change the thesis's substantive textual content.
