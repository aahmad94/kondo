import type { SeedableDeckTitle } from './defaultDecks';

/**
 * Source GPTResponse IDs (Adeel's library) used to populate SeedResponse.
 * Order within each deck is sortOrder (0-based).
 */
export type SeedCatalogLanguageCode = 'zh' | 'ar' | 'ja' | 'ko' | 'es' | 'ur' | 'vi';

export const SEED_CATALOG_SOURCE_IDS: Record<
  SeedCatalogLanguageCode,
  Record<SeedableDeckTitle, string[]>
> = {
  zh: {
    counting: [
      'cmbbe3hk50001l50aohubfn1k',
      'cmsdeqku9000pqtbiuez1takf',
      'cmsdeto2w000vqtbi1yy8stkr',
      'cmsg0e1wt001mqtbioys35yjm',
    ],
    alphabet: ['cmshx9wjk0001jm04ub2ljdg8', 'cmshx8mwu0001jo045ybn2309'],
    travel: [
      'cmsdf8fvo0012qtbi119p9p22',
      'cmsdfgmf10018qtbikvlva7qn',
      'cmsdfjwno001eqtbiaqlpkj0m',
    ],
    verbs: [
      'cmbbeb0b8000hqt385c5e3sa8',
      'cmbbeadf2000fqt381hfrwd03',
      'cmsdfyeq5001iqtbidrxteyqc',
    ],
    introductions: [
      'cmbayipbg0001l404g022aql2',
      'cmb8ed0h10003le04eobwnq8z',
      'cmsdej7qb000jqtbioesr1a9s',
      'cmsde91p9000dqtbi3lm1wflr',
    ],
  },
  ar: {
    counting: ['cmsijmlt30007qtv4be853hbs', 'cmsijimq90005qtv43pkud07e'],
    alphabet: ['cm8gmwtfo0006jl039p624wmc'],
    travel: [
      'cmsg1vuto0030qtbiz409m09e',
      'cmsg1ovfk002sqtbizdbzmmfl',
      'cmsg1kcbh002iqtbi5jdxjkmx',
    ],
    verbs: [
      'cmsg1ic3s002gqtbif33908m0',
      'cmsg1dqef002cqtbiv7nvwyxd',
      'cmsg1cewp002aqtbixdxfc79g',
    ],
    introductions: [
      'cmsil7yyv000cqtv4u8t54cwr',
      'cmsil7ljh000aqtv407629lb0',
      'cmsil8aft000eqtv4opuuketc',
    ],
  },
  ja: {
    counting: [
      'cmsims4rh0003qtxwhgsw0eox',
      'cmsimyhn20005qtxwklcxxj0u',
      'cm7gnov0z001dqtujsqed46qu',
    ],
    alphabet: [
      'cm7gotmln002cqtujr0paobs8',
      'cma6w5kkw0001l1040gpew4cv',
      'cmblt1yd30005ji040zfxbmin',
    ],
    travel: [
      'cmjtdi6po0001jo049ffnamd2',
      'cmbx851000001k004l2gpctt6',
      'cmsonexfl001fqtxwgcwj6a93',
    ],
    verbs: [
      'cmj8umflv0001js048469oucj',
      'cmgbkz63n0005l3047cdyr4ew',
      'cma738ta50003l804dzavp9ft',
      'cmc2orvj20001jv04sv8qzel4',
    ],
    introductions: [
      'cmsklav2s000hqtxwpx5zxzr9',
      'cmsklamu4000fqtxwhdud1q0n',
      'cmsklafgm000dqtxwphucg1t5',
      'cmskl9wuo000bqtxw5p40aaxn',
    ],
  },
  ko: {
    counting: [
      'cmt4bsb8l0009ld040cdl1mkb',
      'cmt4bt44j0007l404aqs8juo6',
      'cmt4btmpl0009l404e2ujq8fv',
    ],
    alphabet: [
      'cmt4c01tx0003ky041tky0tzr',
      'cmt4bz63b0001ky04c55gmary',
      'cm7gxvndn003nqtujk2xof2cm',
    ],
    travel: [
      'cmt4bqfp10005ld043wkhdwpn',
      'cmt4bqxoi0005l40482k8orw6',
      'cmt4brl7p0007ld04n9x920b9',
    ],
    verbs: [
      'cmt4bogcw0001l404rgudlqyg',
      'cmt4bp12y0003ld04mbfvazf3',
      'cmt4bpmwd0003l404irf2or0l',
    ],
    introductions: [
      'cmt4bvy4t000fl404lvsemaqf',
      'cmt4bvhfi000dl404dymwj56f',
      'cmt4buyx0000bl404jjgq8hll',
    ],
  },
  es: {
    counting: [
      'cmtcufyfd000djspecm1dxb2g',
      'cmtcug6f0000fjspeln21xexu',
      'cmtcugjw4000hjspesg9nu1wg',
    ],
    alphabet: [
      'cmtcuh202000jjspee9rff00r',
      'cmtcuha0r000ljspev216ftvv',
      'cmtcuhhf8000njspeh9189oam',
    ],
    travel: [
      'cmtcuf2300001jspetcfbd384',
      'cmtcuf5pi0003jspe63cifh9l',
      'cmtcufax60005jspeae9u363y',
    ],
    verbs: [
      'cmtc7t6ip0027js3p75pxege5',
      'cmtc8j5z8002hjs3pbqqvts1c',
      'cmtc8o6oh002jjs3pfg2c3fxb',
    ],
    introductions: [
      'cmtcufhrj0007jspetazjaaqs',
      'cmtcufm6w0009jspe0ii9fxx3',
      'cmtcufvb7000bjspezpzbmv6r',
    ],
  },
  ur: {
    counting: [
      'cmtcv5nuc000jjsqb4g4aauco',
      'cmtcv5v8u000ljsqb8mnd41dt',
      'cmtcv6ffl000njsqb1sjlyyqb',
    ],
    alphabet: [
      'cmtcv6xqr000pjsqbm9ovbo8l',
      'cmtcv79d9000rjsqbktv54e5c',
      'cmtcv7kjn000tjsqbqpqqqxn7',
    ],
    travel: [
      'cmtcv4inr0007jsqbq34d2azx',
      'cmtcv4lkh0009jsqbzm3e4inj',
      'cmtcv4s4g000bjsqbmeo3dw4x',
    ],
    verbs: [
      'cmtcv3hpd0001jsqb2fhugahn',
      'cmtcv3zjy0003jsqb06k4z0pf',
      'cmtcv4bhc0005jsqbmpik5l7x',
    ],
    introductions: [
      'cmtcv4x6j000djsqb0m9ry2aj',
      'cmtcv5347000fjsqbsj7yy2c3',
      'cmtcv5bp0000hjsqbd6brruwu',
    ],
  },
  vi: {
    counting: [
      'cmtcvcu8d000jjseno00t9e8n',
      'cmtcvd17u000ljsen8uvc8v4t',
      'cmtcvdcj0000njsenktwsmluw',
    ],
    alphabet: [
      'cmtcvdo90000pjsenc4awcryv',
      'cmtcvdx9w000rjsenqs0732uw',
      'cmtcve73j000tjsenrpp172gx',
    ],
    travel: [
      'cmtcvbqxd0007jsenyix2qens',
      'cmtcvc0xy0009jsenyuhx5xcu',
      'cmtcvc6xd000bjsenbcrpn4ie',
    ],
    verbs: [
      'cmtcvaen00001jsen65e4cako',
      'cmtcvb21p0003jsen6kvq881l',
      'cmtcvbeh70005jsenqmgm5on2',
    ],
    introductions: [
      'cmtcvcdf6000djsenbhe3ymas',
      'cmtcvciwo000fjsenxbhgbkag',
      'cmtcvcn30000hjsena7if38ol',
    ],
  },
};
