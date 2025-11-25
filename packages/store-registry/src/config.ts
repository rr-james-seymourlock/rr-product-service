import {
  buildRegExp,
  capture,
  choiceOf,
  digit,
  endOfString,
  repeat,
  word,
  wordBoundary,
} from 'ts-regex-builder';

import type { StoreAlias, StoreConfigInterface } from './types';

const freezeAlias = (alias: StoreAlias): StoreAlias => Object.freeze({ ...alias });

/**
 * Deep freezes a store configuration to prevent runtime mutation.
 * Critical for Lambda warm containers where configs are shared across invocations.
 *
 * Freezes:
 * - Top-level config object
 * - All arrays (aliases, patternFormats, patterns)
 * - All alias objects within the aliases array
 *
 * @param config - The store configuration to freeze
 * @returns Immutable frozen store configuration
 */
const freezeStoreConfig = (config: StoreConfigInterface): StoreConfigInterface => {
  const frozenConfig: StoreConfigInterface = {
    ...config,
    ...(config.aliases && {
      aliases: Object.freeze(config.aliases.map((alias) => freezeAlias(alias))),
    }),
    ...(config.patternFormats && {
      patternFormats: Object.freeze([...config.patternFormats]),
    }),
    ...(config.pathnamePatterns && {
      pathnamePatterns: Object.freeze([...config.pathnamePatterns]),
    }),
    ...(config.searchPatterns && {
      searchPatterns: Object.freeze([...config.searchPatterns]),
    }),
  };

  return Object.freeze(frozenConfig);
};

const mutableStoreConfigs: StoreConfigInterface[] = [
  {
    id: '5246',
    domain: 'target.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, 'a-', capture(repeat(choiceOf(digit), { min: 6, max: 24 })), wordBoundary],
        { global: true },
      ),
    ],
  },
  {
    id: '9528',
    domain: 'nike.com',
    pathnamePatterns: [
      buildRegExp(
        [
          '/',
          capture([
            repeat(choiceOf(word, digit), { min: 6, max: 16 }),
            '-',
            repeat(choiceOf(word, digit), { min: 3, max: 3 }),
          ]),
          wordBoundary,
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '4207',
    domain: 'ulta.com',
    pathnamePatterns: [
      buildRegExp(
        [
          wordBoundary,
          capture(repeat(choiceOf('pimprod', 'xlsimpprod', digit), { min: 6, max: 24 })),
          choiceOf(endOfString, wordBoundary),
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '8378',
    domain: 'qvc.com',
    pathnamePatterns: [
      buildRegExp(
        [
          wordBoundary,
          'product.',
          capture(repeat(choiceOf(digit, word), { min: 6, max: 24 })),
          '.html',
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '2524',
    domain: 'zappos.com',
    pathnamePatterns: [
      buildRegExp(
        [
          '/asin/',
          capture(repeat(choiceOf(digit, word), { min: 6, max: 24 })),
          choiceOf(endOfString, wordBoundary),
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '2946',
    domain: 'walmart.com',
    pathnamePatterns: [
      buildRegExp(
        [
          '/ip/',
          repeat(choiceOf(word, digit, '-', 'seort'), { min: 1 }),
          '/',
          capture(repeat(digit, { min: 6, max: 24 })),
          choiceOf(endOfString, wordBoundary),
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '3864',
    domain: 'gap.com',
    aliases: [
      { id: '13943', domain: 'gapfactory.com' },
      { id: '3726', domain: 'oldnavy.gap.com' },
      { id: '9311', domain: 'bananarepublic.gap.com' },
      { id: '15061', domain: 'bananarepublicfactory.gapfactory.com' },
      { id: '10168', domain: 'athleta.gap.com' },
    ],
  },
  {
    id: '12205',
    domain: 'saksoff5th.com',
    pathnamePatterns: [
      buildRegExp([wordBoundary, capture(repeat(choiceOf(digit), { min: 6, max: 24 })), '.html'], {
        global: true,
      }),
    ],
  },
  {
    id: '13467',
    domain: 'hm.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, 'productpage.', capture(repeat(digit, { min: 6, max: 16 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '16788',
    domain: 'chewy.com',
    pathnamePatterns: [
      buildRegExp(
        [
          wordBoundary,
          'dp/',
          capture(repeat(choiceOf(digit, word), { min: 6, max: 24 })),
          wordBoundary,
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '9141',
    domain: 'anntaylor.com',
    pathnamePatterns: [
      buildRegExp(
        [
          wordBoundary,
          'grp_',
          capture(repeat(digit, { min: 4, max: 16 })),
          '_',
          repeat(digit, { min: 1, max: 8 }),
          '.html',
        ],
        { global: true },
      ),
      buildRegExp(
        [wordBoundary, 'grp_', capture(repeat(choiceOf(digit, '_'), { min: 4, max: 16 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '9205',
    domain: 'love-scent.com',
    pathnamePatterns: [
      buildRegExp([wordBoundary, capture(['p-', repeat(digit, { min: 1, max: 16 })]), '.html'], {
        global: true,
      }),
    ],
    transformId: (id: string) => id.replace('p-', 'sku-'),
  },
  {
    id: '8973',
    domain: 'ikea.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture([repeat(choiceOf(digit, word), { min: 1, max: 16 })]), endOfString],
        { global: true },
      ),
    ],
    transformId: (id: string) => id.replace('s', ''),
  },
  {
    id: '20571',
    domain: 'magneticme.com',
    pathnamePatterns: [
      buildRegExp(
        ['/', capture(repeat(choiceOf(digit, word, '-'), { min: 4, max: 24 })), endOfString],
        { global: true },
      ),
    ],
    transformId: (id: string) => id.replace('_', '-'),
  },
  {
    id: '16016',
    domain: 'mountainwarehouse.com',
    pathnamePatterns: [
      buildRegExp(['-p', capture([repeat(digit, { min: 4, max: 16 })]), '.aspx'], { global: true }),
    ],
  },
  {
    id: '9898',
    domain: 'labseries.com',
    pathnamePatterns: [
      buildRegExp(
        [
          '/product/',
          repeat(digit, { min: 1 }),
          '/',
          capture([repeat(digit, { min: 4, max: 16 })]),
          '/',
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '22077',
    domain: 'theinside.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(digit, { min: 5, max: 16 })), choiceOf(endOfString)],
        { global: true },
      ),
    ],
  },
  {
    id: '10045',
    domain: 'smashbox.com',
    pathnamePatterns: [
      buildRegExp(
        [
          wordBoundary,
          'product/',
          repeat(digit, { min: 1 }),
          '/',
          capture(repeat(digit, { min: 5, max: 16 })),
          '/',
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '14393',
    domain: 'rockyboots.com',
    patternFormats: ['XXX0000__X__000', 'XXX0000__X__000_', 'XX0000'],
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word, '_'), { min: 1, max: 24 })), '.html'],
        { global: true },
      ),
      buildRegExp(
        [
          '/',
          capture([repeat(word, { min: 1, max: 5 }), repeat(digit, { min: 3, max: 8 })]),
          choiceOf('_', endOfString, wordBoundary),
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '4690',
    domain: 'maidenform.com',
    patternFormats: ['XX0000', 'XXXXXX'],
    pathnamePatterns: [
      buildRegExp(['/', capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), endOfString], {
        global: true,
      }),
    ],
  },
  {
    id: '16522',
    domain: 'kathykuohome.com',
    pathnamePatterns: [
      buildRegExp(
        [
          wordBoundary,
          'product/detail/',
          capture(repeat(choiceOf(digit), { min: 3, max: 24 })),
          wordBoundary,
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '16274',
    domain: 'fairwaygolfusa.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, 'pid/', capture(repeat(choiceOf(digit), { min: 3, max: 24 })), endOfString],
        { global: true },
      ),
    ],
  },
  {
    id: '18859',
    domain: 'drmartens.com',
    pathnamePatterns: [
      buildRegExp(
        [
          wordBoundary,
          'p/',
          capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })),
          endOfString,
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '4489',
    domain: 'famousfootwear.com',
    pathnamePatterns: [
      buildRegExp(['-', capture(repeat(digit, { min: 5, max: 24 })), '/', wordBoundary], {
        global: true,
      }),
      buildRegExp([wordBoundary, capture(repeat(digit, { min: 5, max: 24 })), endOfString], {
        global: true,
      }),
    ],
  },
  {
    id: '10269',
    domain: 'care.com',
    pathnamePatterns: [
      buildRegExp([wordBoundary, capture(repeat(choiceOf(digit), { min: 4, max: 24 })), '-'], {
        global: true,
      }),
    ],
  },
  {
    id: '9428',
    domain: 'ae.com',
    pathnamePatterns: [
      buildRegExp(
        [
          choiceOf('/p/', wordBoundary),
          capture(repeat(choiceOf(digit, '_'), { min: 4, max: 24 })),
          endOfString,
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '12539',
    domain: 'zoro.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), endOfString],
        { global: true },
      ),
    ],
  },
  {
    id: '2445',
    domain: 'westelm.com',
    pathnamePatterns: [
      buildRegExp(['-', capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), endOfString], {
        global: true,
      }),
    ],
  },
  {
    id: '13957',
    domain: 'uniqlo.com',
    pathnamePatterns: [
      buildRegExp(
        [
          wordBoundary,
          'products/',
          capture(repeat(choiceOf(digit, word, '-'), { min: 5, max: 24 })),
          '/',
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '2434',
    domain: 'rei.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, 'product/', capture(repeat(choiceOf(digit), { min: 5, max: 24 })), '/'],
        { global: true },
      ),
    ],
  },
  {
    id: '2440',
    domain: 'dickssportinggoods.com',
    pathnamePatterns: [
      buildRegExp(['/', capture(repeat(choiceOf(digit, word), { min: 4, max: 24 })), endOfString], {
        global: true,
      }),
    ],
  },
  {
    id: '2442',
    domain: 'crateandbarrel.com',
    pathnamePatterns: [
      buildRegExp(
        ['/s', capture(repeat(choiceOf(digit, word), { min: 4, max: 24 })), endOfString],
        { global: true },
      ),
    ],
  },
  {
    id: '2428',
    domain: 'bestbuy.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit), { min: 4, max: 24 })), '.p', endOfString],
        { global: true },
      ),
    ],
  },

  // We should likely combine these as they follow same patten.
  {
    id: '5487',
    domain: 'adidas.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 6, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '8980',
    domain: 'katespade.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '8979',
    domain: 'journeys.com',
    pathnamePatterns: [
      buildRegExp(['-', capture(repeat(choiceOf(digit), { min: 4, max: 24 })), endOfString], {
        global: true,
      }),
    ],
  },
  {
    id: '8978',
    domain: 'josbank.com',
    pathnamePatterns: [
      buildRegExp(['-', capture(repeat(choiceOf(digit, word), { min: 4, max: 24 })), endOfString], {
        global: true,
      }),
    ],
  },
  {
    id: '8976',
    domain: 'jcpenney.com',
    pathnamePatterns: [
      buildRegExp(
        ['/product/', capture(repeat(choiceOf(digit, word), { min: 4, max: 24 })), endOfString],
        { global: true },
      ),
    ],
  },
  {
    id: '8981',
    domain: 'kirklands.com',
    pathnamePatterns: [
      buildRegExp([wordBoundary, capture(repeat(choiceOf(digit), { min: 6, max: 24 })), '.uts'], {
        global: true,
      }),
    ],
  },
  {
    id: '8031',
    domain: 'rugsusa.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word, '-'), { min: 6, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '16000',
    domain: 'funko.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '22484',
    domain: 'loungefly.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '8972',
    domain: 'iherb.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit), { min: 5, max: 24 })), endOfString],
        { global: true },
      ),
    ],
  },
  {
    id: '8970',
    domain: 'houzz.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit), { min: 5, max: 24 })), endOfString],
        { global: true },
      ),
    ],
  },
  {
    id: '8963',
    domain: 'harryanddavid.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit), { min: 5, max: 24 })), endOfString],
        { global: true },
      ),
    ],
  },
  {
    id: '12621',
    domain: 'golfgalaxy.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), endOfString],
        { global: true },
      ),
    ],
  },
  {
    id: '10228',
    domain: 'discountschoolsupply.com',
    pathnamePatterns: [
      buildRegExp(
        [
          wordBoundary,
          'p/',
          capture(repeat(choiceOf(digit, word), { min: 4, max: 24 })),
          endOfString,
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '22043',
    domain: 'cuisinart.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word, '-'), { min: 4, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '8965',
    domain: 'healthypets.com',
    pathnamePatterns: [
      buildRegExp([wordBoundary, capture(repeat(choiceOf(digit), { min: 5, max: 24 })), '.html'], {
        global: true,
      }),
    ],
  },
  {
    id: '19196',
    domain: 'circusny.com',
    pathnamePatterns: [
      buildRegExp(
        [
          choiceOf(wordBoundary, '-'),
          capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })),
          endOfString,
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '8933',
    domain: 'childrensplace.com',
    pathnamePatterns: [
      buildRegExp(
        [
          '-',
          capture([
            repeat(digit, { min: 5, max: 24 }),
            '-',
            repeat(choiceOf(digit, word), { min: 2, max: 24 }),
          ]),
          endOfString,
        ],
        { global: true },
      ),
    ],
  },
  {
    id: '8962',
    domain: 'harborfreight.com',
    pathnamePatterns: [
      buildRegExp([wordBoundary, capture(repeat(choiceOf(digit), { min: 5, max: 24 })), '.html'], {
        global: true,
      }),
    ],
  },
  {
    id: '9609',
    domain: 'champssports.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '16829',
    domain: 'cos.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '16829',
    domain: 'costco.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '19490',
    domain: 'acmemarkets.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '2144',
    domain: 'charlestyrwhitt.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '10530',
    domain: 'teva.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '18125',
    domain: 'stories.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '16349',
    domain: 'baggallini.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word, '-'), { min: 2, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '20026',
    domain: 'arlo.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word, '-'), { min: 5, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '2880',
    domain: 'wayfair.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 5, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '22489',
    domain: 'lodgecastiron.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word, '-'), { min: 4, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '8442',
    domain: 'stacyadams.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word, '-'), { min: 4, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '15159',
    domain: '1stoplighting.com',
    pathnamePatterns: [
      buildRegExp(['_', capture(repeat(choiceOf(digit, word, '-'), { min: 1, max: 24 })), '.htm'], {
        global: true,
      }),
    ],
  },
  {
    id: '6326',
    domain: 'lillianvernon.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 4, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '9443',
    domain: 'kiehls.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word), { min: 3, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '8380',
    domain: 'lampsplus.com',
    pathnamePatterns: [
      buildRegExp(['__', capture(repeat(choiceOf(digit, word), { min: 4, max: 24 })), '.html'], {
        global: true,
      }),
    ],
  },
  {
    id: '16449',
    domain: 'campchef.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word, '-'), { min: 4, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '14991',
    domain: 'boohooman.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit, word, '-'), { min: 4, max: 24 })), '.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '10904',
    domain: 'haggar.com',
    pathnamePatterns: [
      buildRegExp([wordBoundary, capture(repeat(choiceOf(digit), { min: 4, max: 24 })), '.html'], {
        global: true,
      }),
    ],
  },
  {
    id: '19546',
    domain: 'dancewearsolutions.com',
    pathnamePatterns: [
      buildRegExp([wordBoundary, capture(repeat(choiceOf(digit), { min: 4, max: 24 })), '.aspx'], {
        global: true,
      }),
    ],
  },
  {
    id: '2447',
    domain: 'overstock.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit), { min: 4, max: 24 })), '/product.html'],
        { global: true },
      ),
    ],
  },
  {
    id: '10722',
    domain: 'lowes.com',
    pathnamePatterns: [
      buildRegExp(
        [wordBoundary, capture(repeat(choiceOf(digit), { min: 4, max: 24 })), endOfString],
        { global: true },
      ),
    ],
  },
  {
    id: '3865',
    domain: 'jcrew.com',
    pathnamePatterns: [
      buildRegExp(
        [
          wordBoundary,
          'p/',
          capture(repeat(choiceOf(digit, word), { min: 4, max: 24 })),
          endOfString,
        ],
        { global: true },
      ),
    ],
  },
  {
    id: 'test-search-patterns',
    domain: 'test-search.example.com',
    pathnamePatterns: [
      buildRegExp([wordBoundary, 'test-', capture(repeat(digit, { min: 6 })), wordBoundary], {
        global: true,
      }),
    ],
    searchPatterns: [
      buildRegExp(
        [
          '[?&]productId=',
          capture(repeat(choiceOf(word, digit), { min: 6, max: 24 })),
          wordBoundary,
        ],
        { global: true },
      ),
      buildRegExp(
        [
          '[?&]sku=',
          capture(repeat(choiceOf(word, digit, '-', '_'), { min: 4, max: 24 })),
          wordBoundary,
        ],
        { global: true },
      ),
    ],
  },
];

export const storeConfigs: ReadonlyArray<StoreConfigInterface> = Object.freeze(
  mutableStoreConfigs.map((config) => freezeStoreConfig(config)),
);
