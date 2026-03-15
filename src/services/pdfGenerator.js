'use strict';

const React = require('react');
const {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  renderToBuffer,
  Font,
  Svg,
  Path,
  Rect,
  Circle,
  Line,
  Polyline,
  Defs,
  LinearGradient,
  Stop,
} = require('@react-pdf/renderer');

const {
  explainRating,
  explainImprovementPotential,
  explainFeature,
  explainImprovement,
  getBenefitsList,
  getNextSteps,
  enhanceWithAI,
} = require('./plainEnglish');

// Color scheme
const COLORS = {
  deepForestGreen: '#113555',
  energyGreen: '#007FC4',
  softSage: '#E6F4FA',
  darkGrey: '#000000',
  white: '#FFFFFF',
  lightGrey: '#F5F5F5',
  mediumGrey: '#888888',
  ratingA: '#00A651',
  ratingB: '#50B848',
  ratingC: '#8DC63F',
  ratingD: '#FFD200',
  ratingE: '#F7941D',
  ratingF: '#F15A29',
  ratingG: '#ED1C24',
};

// Rating colour helper
function getRatingColor(rating) {
  const map = {
    A: COLORS.ratingA,
    B: COLORS.ratingB,
    C: COLORS.ratingC,
    D: COLORS.ratingD,
    E: COLORS.ratingE,
    F: COLORS.ratingF,
    G: COLORS.ratingG,
  };
  return map[rating.toUpperCase()] || COLORS.darkGrey;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.white,
    fontFamily: 'Helvetica',
    paddingBottom: 24,
  },
  // ── Header ──
  pageHeader: {
    backgroundColor: COLORS.deepForestGreen,
    paddingHorizontal: 30,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
  },
  headerSub: {
    color: COLORS.softSage,
    fontSize: 9,
  },
  // ── Page footer ──
  pageFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    backgroundColor: COLORS.deepForestGreen,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  footerText: {
    color: COLORS.white,
    fontSize: 8,
  },
  // ── Cover Page ──
  coverPage: {
    backgroundColor: COLORS.deepForestGreen,
  },
  coverPhotoContainer: {
    width: '100%',
    height: 240,
    overflow: 'hidden',
  },
  coverPhoto: {
    width: '100%',
    height: 240,
    objectFit: 'cover',
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: 240,
    backgroundColor: '#0D2A42',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPhotoPlaceholderText: {
    color: COLORS.softSage,
    fontSize: 14,
    opacity: 0.7,
  },
  coverContent: {
    paddingHorizontal: 40,
    paddingTop: 30,
  },
  coverMainTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  coverSubTitle: {
    color: COLORS.softSage,
    fontSize: 12,
    marginBottom: 30,
  },
  coverAddressBox: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: 16,
    marginBottom: 24,
  },
  coverAddressLabel: {
    color: COLORS.energyGreen,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  coverAddress: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  coverPostcode: {
    color: COLORS.softSage,
    fontSize: 11,
    marginTop: 2,
  },
  ratingsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 30,
  },
  ratingBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  ratingBoxLabel: {
    color: COLORS.softSage,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  ratingBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  ratingLetter: {
    color: COLORS.white,
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
  },
  ratingScore: {
    color: COLORS.white,
    fontSize: 10,
  },
  coverDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coverMeta: {
    color: COLORS.softSage,
    fontSize: 9,
  },
  // ── Content pages ──
  contentPage: {
    backgroundColor: COLORS.white,
  },
  sectionTitle: {
    color: COLORS.deepForestGreen,
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.energyGreen,
  },
  bodyText: {
    color: COLORS.darkGrey,
    fontSize: 10,
    lineHeight: 1.6,
    marginBottom: 10,
  },
  pageBody: {
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 46,
  },
  // ── EPC Scale bar ──
  scaleContainer: {
    marginVertical: 16,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scaleBand: {
    height: 22,
    borderRadius: 2,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  scaleLetter: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  scaleRange: {
    color: COLORS.darkGrey,
    fontSize: 9,
    marginLeft: 8,
  },
  currentMarker: {
    color: COLORS.deepForestGreen,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginLeft: 6,
  },
  potentialMarker: {
    color: COLORS.energyGreen,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginLeft: 6,
  },
  // ── Info panel ──
  infoPanel: {
    backgroundColor: COLORS.softSage,
    borderRadius: 6,
    padding: 14,
    marginVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.deepForestGreen,
  },
  infoPanelText: {
    color: COLORS.darkGrey,
    fontSize: 10,
    lineHeight: 1.6,
    fontStyle: 'italic',
  },
  // ── Cost table ──
  costTable: {
    marginVertical: 12,
  },
  costRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  costRowAlt: {
    backgroundColor: COLORS.lightGrey,
  },
  costLabel: {
    flex: 2,
    color: COLORS.darkGrey,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  costValue: {
    flex: 1,
    color: COLORS.deepForestGreen,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  costHeader: {
    backgroundColor: COLORS.deepForestGreen,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    borderRadius: 4,
    marginBottom: 2,
  },
  costHeaderText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    flex: 2,
  },
  costHeaderValue: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    flex: 1,
    textAlign: 'right',
  },
  // ── Feature cards ──
  featureCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  featureCardHeader: {
    backgroundColor: COLORS.deepForestGreen,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  featureCardHeaderText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  featureCardDesc: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.lightGrey,
  },
  featureCardDescText: {
    color: COLORS.mediumGrey,
    fontSize: 9,
    fontStyle: 'italic',
  },
  featureCardExplanation: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  featureCardExplanationText: {
    color: COLORS.darkGrey,
    fontSize: 10,
    lineHeight: 1.5,
  },
  // ── Improvement cards ──
  improvementCard: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
  },
  improvementHeader: {
    backgroundColor: COLORS.energyGreen,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  improvementHeaderText: {
    color: COLORS.white,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  improvementBody: {
    padding: 12,
  },
  improvementMetaRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 12,
  },
  improvementMeta: {
    flex: 1,
    backgroundColor: COLORS.softSage,
    borderRadius: 4,
    padding: 8,
  },
  improvementMetaLabel: {
    color: COLORS.deepForestGreen,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  improvementMetaValue: {
    color: COLORS.darkGrey,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  improvementExplanation: {
    color: COLORS.darkGrey,
    fontSize: 10,
    lineHeight: 1.5,
  },
  // ── CO2 / Environmental ──
  co2Row: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 12,
  },
  co2Box: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  co2BoxLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  co2BoxValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  co2BoxSub: {
    fontSize: 9,
  },
  // ── Benefits list ──
  benefitItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  benefitBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.energyGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  benefitBulletText: {
    color: COLORS.white,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  benefitText: {
    flex: 1,
    color: COLORS.darkGrey,
    fontSize: 10,
    lineHeight: 1.5,
  },
  // ── Next steps ──
  stepRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.deepForestGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumberText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  stepText: {
    flex: 1,
    color: COLORS.darkGrey,
    fontSize: 10,
    lineHeight: 1.5,
    paddingTop: 3,
  },
  // ── Assessor details ──
  assessorBox: {
    backgroundColor: COLORS.softSage,
    borderRadius: 8,
    padding: 20,
    marginTop: 16,
  },
  assessorLabel: {
    color: COLORS.deepForestGreen,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  assessorValue: {
    color: COLORS.darkGrey,
    fontSize: 11,
    marginBottom: 10,
  },
  disclaimerBox: {
    backgroundColor: COLORS.lightGrey,
    borderRadius: 6,
    padding: 12,
    marginTop: 16,
  },
  disclaimerText: {
    color: COLORS.mediumGrey,
    fontSize: 8,
    lineHeight: 1.5,
  },
});

// ─── Sub-components ────────────────────────────────────────────────────────────

function PageHeader({ title }) {
  return (
    <View style={styles.pageHeader}>
      <View>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSub}>Energy Performance Certificate Report</Text>
      </View>
      <Text style={[styles.headerSub, { fontSize: 10 }]}>EPC</Text>
    </View>
  );
}

function PageFooter({ pageNum, address }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text style={styles.footerText}>{address}</Text>
      <Text style={styles.footerText}>Page {pageNum}</Text>
    </View>
  );
}

const RATING_BANDS = [
  { letter: 'A', min: 92, max: 100, width: 80 },
  { letter: 'B', min: 81, max: 91, width: 90 },
  { letter: 'C', min: 69, max: 80, width: 100 },
  { letter: 'D', min: 55, max: 68, width: 115 },
  { letter: 'E', min: 39, max: 54, width: 130 },
  { letter: 'F', min: 21, max: 38, width: 145 },
  { letter: 'G', min: 1, max: 20, width: 160 },
];

function EPCScaleBar({ currentRating, potentialRating }) {
  return (
    <View style={styles.scaleContainer}>
      {RATING_BANDS.map((band) => (
        <View key={band.letter} style={styles.scaleRow}>
          <View
            style={[
              styles.scaleBand,
              { backgroundColor: getRatingColor(band.letter), width: band.width },
            ]}
          >
            <Text style={styles.scaleLetter}>{band.letter}</Text>
          </View>
          <Text style={styles.scaleRange}>
            {band.min}–{band.max}
          </Text>
          {currentRating.toUpperCase() === band.letter && (
            <Text style={styles.currentMarker}>◄ Current</Text>
          )}
          {potentialRating.toUpperCase() === band.letter &&
            potentialRating !== currentRating && (
              <Text style={styles.potentialMarker}>◄ Potential</Text>
            )}
        </View>
      ))}
    </View>
  );
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function CoverPage({ data, propertyPhotoBase64 }) {
  return (
    <Page size="A4" style={{ backgroundColor: '#dce8f4', fontFamily: 'Helvetica', flexDirection: 'column' }}>

      {/* ── TOP-RIGHT BLUE WAVE (absolutely positioned, behind header text) ── */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}>
        <Svg width="595" height="260" viewBox="0 0 595 260">
          <Defs>
            <LinearGradient id="blueMain" x1="595" y1="0" x2="200" y2="260" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#1060c0" />
              <Stop offset="100%" stopColor="#0a3d96" />
            </LinearGradient>
            <LinearGradient id="silverRib" x1="595" y1="0" x2="250" y2="260" gradientUnits="userSpaceOnUse">
              <Stop offset="0%" stopColor="#d0dff0" />
              <Stop offset="60%" stopColor="#b8cfe8" />
              <Stop offset="100%" stopColor="#a0bcd8" stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d="M595 0 L595 260 Q521 226 421 170 Q322 114 211 46 Q136 6 75 0 Z" fill="url(#silverRib)" opacity="0.7" />
          <Path d="M595 0 L595 240 Q508 200 409 143 Q316 91 217 32 Q161 6 112 0 Z" fill="url(#blueMain)" />
          <Path d="M595 0 L595 176 Q533 143 458 100 Q384 59 322 22 Q285 6 254 0 Z" fill="#5a9ee0" opacity="0.45" />
          <Path d="M595 240 Q508 200 409 143 Q316 91 217 32 Q161 6 112 0 L137 0 Q183 9 238 38 Q334 93 426 148 Q523 202 595 242 Z" fill="#7ab4e8" opacity="0.3" />
        </Svg>
      </View>

      {/* ── HEADER TEXT ── */}
      <View style={{ paddingTop: 38, paddingLeft: 30, paddingRight: 30, paddingBottom: 18 }}>
        <Text style={{ fontSize: 30, fontFamily: 'Helvetica-Bold', color: '#0b3060', lineHeight: 1.0 }}>Understanding</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 4, gap: 8 }}>
          <View style={{ height: 2, width: 32, backgroundColor: '#8da8c0' }} />
          <Text style={{ fontSize: 13, color: '#0b3060', fontStyle: 'italic' }}> the </Text>
          <Text style={{ fontSize: 30, fontFamily: 'Helvetica-Bold', color: '#1358b8' }}>Energy</Text>
          <View style={{ height: 2, width: 32, backgroundColor: '#8da8c0' }} />
        </View>
        <Text style={{ fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#0b3060', lineHeight: 1.1 }}>Performance of</Text>
        <Text style={{ fontSize: 30, fontFamily: 'Helvetica-Bold', color: '#0b3060', lineHeight: 1.0 }}>Your Home</Text>
      </View>

      {/* ── PHOTO SECTION: full width, no card/band ── */}
      <View style={{ height: 360, width: 595, overflow: 'hidden' }}>
        {propertyPhotoBase64 ? (
          <Image
            src={propertyPhotoBase64}
            style={{ width: 595, height: 360, objectFit: 'cover' }}
          />
        ) : (
          <View style={{ width: 595, height: 360, backgroundColor: '#c8daea', alignItems: 'center', justifyContent: 'center' }}>
            <Svg width="72" height="72" viewBox="0 0 72 72">
              <Path d="M36 8 L66 30 V64 H6 V30 Z" stroke="#1255b0" strokeWidth="2.8" fill="none" strokeLinejoin="round" strokeLinecap="round" />
              <Rect x="26" y="42" width="20" height="22" rx="2" stroke="#1255b0" strokeWidth="2.2" fill="none" />
              <Rect x="14" y="35" width="12" height="12" rx="2" stroke="#1255b0" strokeWidth="2" fill="none" />
              <Rect x="46" y="35" width="12" height="12" rx="2" stroke="#1255b0" strokeWidth="2" fill="none" />
              <Path d="M36 8 L36 2" stroke="#1255b0" strokeWidth="2" strokeLinecap="round" />
            </Svg>
            <Text style={{ fontSize: 10, color: '#1255b0', marginTop: 12, fontFamily: 'Helvetica' }}>Property Photo</Text>
          </View>
        )}
      </View>

      {/* ── WAVE DIVIDER — full width ── */}
      <View style={{ width: 595 }}>
        <Svg width="595" height="50" viewBox="0 0 595 50" preserveAspectRatio="none">
          <Path d="M0 0 L595 0 L595 25 Q447 6 298 23 Q149 40 0 20 Z" fill="#cddaea" />
          <Path d="M0 20 Q149 40 298 23 Q447 6 595 25 L595 50 L0 50 Z" fill="#0e2f5e" />
        </Svg>
      </View>

      {/* ── ADDRESS SECTION — full width dark navy ── */}
      <View style={{ width: 595, backgroundColor: '#0e2f5e', paddingHorizontal: 30, paddingVertical: 14, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}>
            <Svg width="12" height="14" viewBox="0 0 20 20">
              <Path d="M10 1.5C6.96 1.5 4.5 3.96 4.5 7c0 4.62 5.5 11.5 5.5 11.5S15.5 11.62 15.5 7C15.5 3.96 13.04 1.5 10 1.5zm0 7.75a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5z" fill="#ffffff" />
            </Svg>
          </View>
          <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#ffffff' }}>
            {data.propertyAddress || 'Property Address'}
          </Text>
        </View>
        {data.companyName ? (
          <Text style={{ fontSize: 9, color: 'rgba(185,210,240,0.9)', marginTop: 1 }}>{data.companyName}</Text>
        ) : null}
        {data.postcode ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 6 }}>
            <View style={{ flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 1 }}>{data.postcode}</Text>
            <View style={{ flex: 1, height: 1.5, backgroundColor: 'rgba(255,255,255,0.25)' }} />
          </View>
        ) : null}
      </View>

      {/* ── ICONS BAR — fills rest of page ── */}
      <View style={{ flex: 1, width: 595, backgroundColor: '#dce8f4', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }}>
        {/* Improve Efficiency */}
        <View style={{ flex: 1, alignItems: 'center', gap: 5 }}>
          <Svg width="36" height="36" viewBox="0 0 52 52">
            <Path d="M26 8 L44 22 V44 H8 V22 Z" stroke="#1255b0" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
            <Rect x="19" y="30" width="14" height="14" rx="1.5" stroke="#1255b0" strokeWidth="1.8" fill="none" />
            <Rect x="10" y="25" width="8" height="8" rx="1" stroke="#1255b0" strokeWidth="1.6" fill="none" />
            <Rect x="34" y="25" width="8" height="8" rx="1" stroke="#1255b0" strokeWidth="1.6" fill="none" />
            <Circle cx="38" cy="14" r="8" fill="#1255b0" />
            <Polyline points="34,14 37,17 42,10" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0b3060', textAlign: 'center' }}>Improve Efficiency</Text>
        </View>
        <View style={{ width: 1, height: 60, backgroundColor: 'rgba(13,50,100,0.15)' }} />
        {/* Reduce Costs — £ coin icon */}
        <View style={{ flex: 1, alignItems: 'center', gap: 5 }}>
          <Svg width="36" height="36" viewBox="0 0 52 52">
            {/* coin circle */}
            <Circle cx="26" cy="26" r="17" stroke="#1255b0" strokeWidth="2.2" fill="none" />
            {/* £ sign: top serif bar */}
            <Path d="M 22 17 Q 19 17 19 21 Q 19 25 22 25" stroke="#1255b0" strokeWidth="2" fill="none" strokeLinecap="round" />
            {/* £ sign: middle horizontal bar */}
            <Line x1="17" y1="25" x2="24" y2="25" stroke="#1255b0" strokeWidth="2" strokeLinecap="round" />
            {/* £ sign: bottom horizontal bar */}
            <Line x1="17" y1="33" x2="31" y2="33" stroke="#1255b0" strokeWidth="2" strokeLinecap="round" />
            {/* £ sign: vertical stem */}
            <Line x1="19" y1="21" x2="19" y2="33" stroke="#1255b0" strokeWidth="2" strokeLinecap="round" />
          </Svg>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0b3060', textAlign: 'center' }}>Reduce Costs</Text>
        </View>
        <View style={{ width: 1, height: 60, backgroundColor: 'rgba(13,50,100,0.15)' }} />
        {/* Lower Emissions */}
        <View style={{ flex: 1, alignItems: 'center', gap: 5 }}>
          <Svg width="36" height="36" viewBox="0 0 52 52">
            <Path d="M18 44 Q10 32 18 20 Q22 14 30 13 Q25 23 23 34 Z" stroke="#1255b0" strokeWidth="2" fill="none" strokeLinejoin="round" />
            <Path d="M28 44 Q42 33 38 17 Q34 10 24 10 Q30 20 30 34 Z" stroke="#1255b0" strokeWidth="2" fill="none" strokeLinejoin="round" />
            <Path d="M26 44 Q26 40 26 34 Q24 30 22 26" stroke="#1255b0" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </Svg>
          <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#0b3060', textAlign: 'center' }}>Lower Emissions</Text>
        </View>
      </View>

    </Page>
  );
}

function RatingMeaningPage({ data }) {
  return (
    <Page size="A4" style={styles.contentPage}>
      <PageHeader title="What Your Energy Rating Means" />
      <View style={styles.pageBody}>
        <Text style={styles.sectionTitle}>What Your Energy Rating Means</Text>
        <Text style={styles.bodyText}>
          {data.aiRatingExplanation ?? explainRating(data.currentRating, data.currentScore)}
        </Text>
        <Text style={styles.bodyText}>
          {data.aiImprovementPotential ??
            explainImprovementPotential(
              data.currentRating,
              data.potentialRating,
              data.potentialScore
            )}
        </Text>

        <EPCScaleBar
          currentRating={data.currentRating}
          potentialRating={data.potentialRating}
        />

        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelText}>
            "A rating closer to A means your home is more energy efficient and cheaper to run.
            A rating closer to G means the property uses more energy and may cost more to heat."
          </Text>
        </View>

        <Text style={styles.bodyText}>
          Energy efficiency is measured on a scale from 1 (very poor) to 100 (very efficient),
          and each band from A to G represents a range of scores. The higher your score, the
          less energy your home uses and the lower your bills are likely to be.
        </Text>
      </View>
      <PageFooter pageNum={2} address={data.propertyAddress} />
    </Page>
  );
}

function EnergyCostsPage({ data }) {
  return (
    <Page size="A4" style={styles.contentPage}>
      <PageHeader title="Estimated Energy Costs" />
      <View style={styles.pageBody}>
        <Text style={styles.sectionTitle}>Estimated Energy Costs for Your Home</Text>
        <Text style={styles.bodyText}>
          The table below shows the estimated energy costs for your home based on a typical
          household. These are calculated using standard assumptions about how a home is used.
        </Text>

        <View style={styles.costTable}>
          <View style={styles.costHeader}>
            <Text style={styles.costHeaderText}>Type of Energy Use</Text>
            <Text style={styles.costHeaderValue}>Estimated Cost</Text>
          </View>
          {[
            { label: 'Heating', value: data.energyCosts.heating },
            { label: 'Hot Water', value: data.energyCosts.hotWater },
            { label: 'Lighting', value: data.energyCosts.lighting },
          ].map((row, i) => (
            <View
              key={row.label}
              style={[styles.costRow, i % 2 === 1 ? styles.costRowAlt : {}]}
            >
              <Text style={styles.costLabel}>{row.label}</Text>
              <Text style={styles.costValue}>{row.value}</Text>
            </View>
          ))}
          <View style={[styles.costRow, { backgroundColor: COLORS.softSage }]}>
            <Text style={[styles.costLabel, { color: COLORS.deepForestGreen }]}>
              Total (estimated)
            </Text>
            <Text style={[styles.costValue, { color: COLORS.deepForestGreen }]}>
              {data.energyCosts.total}
            </Text>
          </View>
        </View>

        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelText}>
            "These figures are estimates based on a typical household. Your actual energy
            costs may vary depending on how the home is used, how many people live there,
            current energy prices, and your energy supplier."
          </Text>
        </View>

        <Text style={styles.bodyText}>
          These costs are per year and are based on standard occupancy patterns. They do not
          include any appliances such as washing machines, televisions, or computers.
        </Text>
      </View>
      <PageFooter pageNum={3} address={data.propertyAddress} />
    </Page>
  );
}

function KeyFeaturesPage({ data }) {
  return (
    <Page size="A4" style={styles.contentPage}>
      <PageHeader title="Key Features of Your Home" />
      <View style={styles.pageBody}>
        <Text style={styles.sectionTitle}>How Your Home Is Built</Text>
        <Text style={styles.bodyText}>
          This section explains the key construction and energy features of your home.
          Understanding these features helps show why your home has the energy rating it does
          and where heat may be lost.
        </Text>

        {data.features.slice(0, 8).map((feature) => (
          <View key={feature.name} style={styles.featureCard}>
            <View style={styles.featureCardHeader}>
              <Text style={styles.featureCardHeaderText}>{feature.name}</Text>
            </View>
            <View style={styles.featureCardDesc}>
              <Text style={styles.featureCardDescText}>{feature.description}</Text>
            </View>
            <View style={styles.featureCardExplanation}>
              <Text style={styles.featureCardExplanationText}>
                {data.aiFeatureExplanations?.[feature.name] ?? explainFeature(feature)}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <PageFooter pageNum={4} address={data.propertyAddress} />
    </Page>
  );
}

function EnvironmentalImpactPage({ data }) {
  return (
    <Page size="A4" style={styles.contentPage}>
      <PageHeader title="Environmental Impact" />
      <View style={styles.pageBody}>
        <Text style={styles.sectionTitle}>Environmental Impact</Text>
        <Text style={styles.bodyText}>
          Your home's environmental impact is measured by how much carbon dioxide (CO₂)
          it produces each year. CO₂ is a greenhouse gas that contributes to climate change.
          The less energy your home uses, the lower its CO₂ output.
        </Text>

        <View style={styles.co2Row}>
          <View
            style={[
              styles.co2Box,
              { backgroundColor: getRatingColor(data.environmentalRatingCurrent) + '22' },
            ]}
          >
            <Text style={[styles.co2BoxLabel, { color: getRatingColor(data.environmentalRatingCurrent) }]}>
              Current CO₂ Emissions
            </Text>
            <Text
              style={[
                styles.co2BoxValue,
                { color: getRatingColor(data.environmentalRatingCurrent) },
              ]}
            >
              {data.currentCO2.replace(' per year', '')}
            </Text>
            <Text style={[styles.co2BoxSub, { color: COLORS.darkGrey }]}>per year</Text>
            <Text
              style={[
                styles.co2BoxValue,
                { color: getRatingColor(data.environmentalRatingCurrent), fontSize: 28, marginTop: 8 },
              ]}
            >
              {data.environmentalRatingCurrent}
            </Text>
            <Text style={[styles.co2BoxSub, { color: COLORS.mediumGrey }]}>rating</Text>
          </View>

          <View
            style={[
              styles.co2Box,
              { backgroundColor: getRatingColor(data.environmentalRatingPotential) + '22' },
            ]}
          >
            <Text
              style={[
                styles.co2BoxLabel,
                { color: getRatingColor(data.environmentalRatingPotential) },
              ]}
            >
              Potential CO₂ Emissions
            </Text>
            <Text
              style={[
                styles.co2BoxValue,
                { color: getRatingColor(data.environmentalRatingPotential) },
              ]}
            >
              {data.potentialCO2.replace(' per year', '')}
            </Text>
            <Text style={[styles.co2BoxSub, { color: COLORS.darkGrey }]}>per year</Text>
            <Text
              style={[
                styles.co2BoxValue,
                { color: getRatingColor(data.environmentalRatingPotential), fontSize: 28, marginTop: 8 },
              ]}
            >
              {data.environmentalRatingPotential}
            </Text>
            <Text style={[styles.co2BoxSub, { color: COLORS.mediumGrey }]}>rating</Text>
          </View>
        </View>

        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelText}>
            "This estimate shows how much carbon dioxide your home produces each year from
            energy use. Making energy efficiency improvements would reduce this figure and
            help lower your household's carbon footprint."
          </Text>
        </View>

        <Text style={styles.bodyText}>
          Environmental impact is rated on the same A–G scale as energy efficiency. An A
          rating means very low CO₂ emissions, while a G rating means very high emissions.
          If all improvements in this report were carried out, your home's environmental
          impact rating could improve from {data.environmentalRatingCurrent} to{' '}
          {data.environmentalRatingPotential}.
        </Text>
      </View>
      <PageFooter pageNum={5} address={data.propertyAddress} />
    </Page>
  );
}

function RecommendedImprovementsPage({ data }) {
  return (
    <Page size="A4" style={styles.contentPage}>
      <PageHeader title="Recommended Improvements" />
      <View style={styles.pageBody}>
        <Text style={styles.sectionTitle}>Recommended Improvements for Your Home</Text>
        <Text style={styles.bodyText}>
          The improvements listed below have been identified by the energy assessor as measures
          that could improve the energy efficiency of your home. Carrying out these improvements
          could raise your EPC rating and reduce your energy bills.
        </Text>

        {data.improvements.map((improvement, index) => {
          const { plainTitle, plainDescription } =
            data.aiImprovementExplanations?.[index] ?? explainImprovement(improvement);
          return (
            <View key={index} style={styles.improvementCard}>
              <View style={styles.improvementHeader}>
                <Text style={styles.improvementHeaderText}>{plainTitle}</Text>
              </View>
              <View style={styles.improvementBody}>
                <View style={styles.improvementMetaRow}>
                  <View style={styles.improvementMeta}>
                    <Text style={styles.improvementMetaLabel}>Estimated Cost</Text>
                    <Text style={styles.improvementMetaValue}>
                      {improvement.typicalCostRange}
                    </Text>
                  </View>
                  <View style={styles.improvementMeta}>
                    <Text style={styles.improvementMetaLabel}>Potential Annual Saving</Text>
                    <Text style={styles.improvementMetaValue}>
                      {improvement.typicalAnnualSaving}
                    </Text>
                  </View>
                  <View style={styles.improvementMeta}>
                    <Text style={styles.improvementMetaLabel}>Potential EPC Rating</Text>
                    <Text style={styles.improvementMetaValue}>
                      {improvement.ratingAfterImprovement || 'See EPC'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.improvementExplanation}>{plainDescription}</Text>
              </View>
            </View>
          );
        })}
      </View>
      <PageFooter pageNum={6} address={data.propertyAddress} />
    </Page>
  );
}

function PotentialBenefitsPage({ data }) {
  const benefits = data.aiBenefits ?? getBenefitsList(data);
  return (
    <Page size="A4" style={styles.contentPage}>
      <PageHeader title="Potential Benefits" />
      <View style={styles.pageBody}>
        <Text style={styles.sectionTitle}>How These Improvements Could Help</Text>
        <Text style={styles.bodyText}>
          Carrying out energy efficiency improvements to your home can bring a wide range of
          benefits — not just financial savings. Here is a summary of the key ways your home
          and lifestyle could improve.
        </Text>

        {benefits.map((benefit, i) => (
          <View key={i} style={styles.benefitItem}>
            <View style={styles.benefitBullet}>
              <Text style={styles.benefitBulletText}>✓</Text>
            </View>
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}

        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelText}>
            Even small improvements can make a real difference over time. You do not need to
            carry out all improvements at once — start with the most affordable and work
            through the list as your budget allows.
          </Text>
        </View>
      </View>
      <PageFooter pageNum={7} address={data.propertyAddress} />
    </Page>
  );
}

function NextStepsPage({ data }) {
  const steps = data.aiNextSteps ?? getNextSteps(data);
  return (
    <Page size="A4" style={styles.contentPage}>
      <PageHeader title="Next Steps" />
      <View style={styles.pageBody}>
        <Text style={styles.sectionTitle}>What You Can Do Next</Text>
        <Text style={styles.bodyText}>
          Now that you understand your home's energy performance, here are some practical
          steps you can take to start making improvements.
        </Text>

        {steps.map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{i + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}

        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelText}>
            For more information about grants and funding, visit the government's
            Energy Saving Advice Service or speak to your energy assessor directly.
          </Text>
        </View>
      </View>
      <PageFooter pageNum={8} address={data.propertyAddress} />
    </Page>
  );
}

function AssessorDetailsPage({ data }) {
  return (
    <Page size="A4" style={styles.contentPage}>
      <PageHeader title="Assessor Details" />
      <View style={styles.pageBody}>
        <Text style={styles.sectionTitle}>Your Energy Assessor</Text>
        <Text style={styles.bodyText}>
          This customer report was prepared based on the official Energy Performance
          Certificate for your property. Below are the details of the company and assessor
          who carried out the assessment.
        </Text>

        <View style={styles.assessorBox}>
          {[
            { label: 'Company', value: data.companyName },
            { label: 'Assessor', value: data.assessorName },
            { label: 'Assessment Date', value: data.assessmentDate },
            { label: 'Contact', value: data.assessorContact || 'Please contact your assessor' },
          ].map((item) => (
            <View key={item.label} style={{ marginBottom: 10 }}>
              <Text style={styles.assessorLabel}>{item.label}</Text>
              <Text style={styles.assessorValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            Disclaimer: This customer report has been produced to help you understand your
            Energy Performance Certificate (EPC). It is a simplified version of your official
            EPC and is intended for guidance only. The estimated energy costs and carbon
            emissions shown in this report are based on standard assumptions and may differ
            from your actual usage. This report does not replace your official EPC. The
            official EPC is the only document that is legally recognised for property
            transactions and rental compliance purposes. Always refer to your official EPC
            for legal and compliance requirements. Improvement costs and savings shown are
            typical estimates only — actual costs will vary depending on the property, the
            installer, and current market prices.
          </Text>
        </View>
      </View>
      <PageFooter pageNum={9} address={data.propertyAddress} />
    </Page>
  );
}

// ─── Main generator ───────────────────────────────────────────────────────────

async function generateEPCReport(epcData, propertyPhotoBase64) {
  console.log('[PDF] photo received:', propertyPhotoBase64 ? `YES (${propertyPhotoBase64.length} chars, type: ${propertyPhotoBase64.substring(0,30)})` : 'NO');
  // Enrich with GPT-generated plain English (falls back silently if key missing/fails)
  await enhanceWithAI(epcData);

  const doc = (
    <Document
      title={`EPC Report – ${epcData.propertyAddress}`}
      author={epcData.companyName}
      subject="Energy Performance Certificate Customer Report"
    >
      <CoverPage data={epcData} propertyPhotoBase64={propertyPhotoBase64} />
      <RatingMeaningPage data={epcData} />
      <EnergyCostsPage data={epcData} />
      <KeyFeaturesPage data={epcData} />
      <EnvironmentalImpactPage data={epcData} />
      <RecommendedImprovementsPage data={epcData} />
      <PotentialBenefitsPage data={epcData} />
      <NextStepsPage data={epcData} />
      <AssessorDetailsPage data={epcData} />
    </Document>
  );

  return await renderToBuffer(doc);
}

module.exports = { generateEPCReport };
