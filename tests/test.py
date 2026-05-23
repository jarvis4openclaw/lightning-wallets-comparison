#!/usr/bin/env python3
"""Tests for Lightning Wallets Comparison site.

Validates:
1. Data integrity (wallets.json)
2. Filter logic (ported from app.js)
3. Sort logic (ported from app.js)
4. HTML structure
"""

import json
import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / 'wallets.json'
HTML_PATH = ROOT / 'index.html'


# ——— Data Models ———
COLUMNS = [
    'name', 'link', 'repo', 'fees', 'selfHostable',
    'nonCustodial', 'lnAddress', 'autoWithdraw', 'nwc',
    'ecash', 'customMint', 'multipleMints',
]

REQUIRED_KEYS = set(COLUMNS)
BOOLEAN_KEYS = {'selfHostable', 'autoWithdraw', 'nwc', 'ecash', 'customMint', 'multipleMints'}
CUSTODIAL_VALUES = {'Yes', 'No', 'Both', 'Optional'}


def load_data():
    with open(DATA_PATH) as f:
        return json.load(f)


def filter_wallets(wallets, filters, search=''):
    """Port of getFiltered() from app.js."""
    result = list(wallets)

    for key, val in filters.items():
        if val is None:
            continue
        if key == 'nonCustodial':
            if val == 'yes':
                result = [w for w in result if w['nonCustodial'] in ('Yes', 'Both')]
            elif val == 'optional':
                result = [w for w in result if w['nonCustodial'] in ('Optional', 'Both')]
            elif val == 'no':
                result = [w for w in result if w['nonCustodial'] == 'No']
        elif key == 'lnAddress':
            if val is True:
                result = [w for w in result if w['lnAddress'] is True or (isinstance(w['lnAddress'], str) and len(w['lnAddress']) > 0)]
            elif val is False:
                result = [w for w in result if w['lnAddress'] is False]
        else:
            result = [w for w in result if w[key] == val]

    if search.strip():
        q = search.lower()
        result = [w for w in result if any(
            q in str(w.get(col, '')).lower()
            for col in COLUMNS
        )]

    return result


def sort_wallets(wallets, key='name', direction='asc'):
    """Port of sort logic from app.js."""
    def sort_key(w):
        val = w.get(key)
        if val is None:
            val = ''
        if isinstance(val, bool):
            val = 1 if val else 0
        # Fees numeric sort
        if key == 'fees':
            s = str(val).lower()
            try:
                return float(''.join(c for c in s if c.isdigit() or c == '.'))
            except ValueError:
                return 999 if 'free' not in s else 0
        return str(val).lower()

    rev = direction == 'desc'
    return sorted(wallets, key=sort_key, reverse=rev)


# ——— Tests ———
class TestDataIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = load_data()

    def test_data_file_exists(self):
        self.assertTrue(DATA_PATH.exists(), 'wallets.json missing')

    def test_categories_present(self):
        self.assertIn('openSource', self.data)
        self.assertIn('freemium', self.data)
        self.assertIsInstance(self.data['openSource'], list)
        self.assertIsInstance(self.data['freemium'], list)

    def test_open_source_count(self):
        self.assertGreaterEqual(len(self.data['openSource']), 10)

    def test_freemium_count(self):
        self.assertGreaterEqual(len(self.data['freemium']), 4)

    def test_all_required_keys(self):
        for cat in ('openSource', 'freemium'):
            for i, wallet in enumerate(self.data[cat]):
                missing = REQUIRED_KEYS - set(wallet.keys())
                self.assertEqual(missing, set(),
                    f'{cat}[{i}] "{wallet.get("name", "?")}" missing keys: {missing}')

    def test_no_extra_keys(self):
        for cat in ('openSource', 'freemium'):
            for i, wallet in enumerate(self.data[cat]):
                extra = set(wallet.keys()) - REQUIRED_KEYS
                self.assertEqual(extra, set(),
                    f'{cat}[{i}] "{wallet.get("name", "?")}" extra keys: {extra}')

    def test_boolean_fields(self):
        for cat in ('openSource', 'freemium'):
            for i, wallet in enumerate(self.data[cat]):
                for key in BOOLEAN_KEYS:
                    self.assertIsInstance(wallet.get(key), bool,
                        f'{cat}[{i}] "{wallet.get("name")}" {key} should be bool')

    def test_non_custodial_values(self):
        for cat in ('openSource', 'freemium'):
            for i, wallet in enumerate(self.data[cat]):
                val = wallet.get('nonCustodial')
                self.assertIn(val, CUSTODIAL_VALUES,
                    f'{cat}[{i}] "{wallet.get("name")}" nonCustodial="{val}" invalid')

    def test_links_are_urls(self):
        for cat in ('openSource', 'freemium'):
            for wallet in self.data[cat]:
                self.assertTrue(wallet['link'].startswith('https://'),
                    f'{wallet["name"]} link not HTTPS: {wallet["link"]}')

    def test_repos_are_urls_or_null(self):
        for cat in ('openSource', 'freemium'):
            for wallet in self.data[cat]:
                repo = wallet['repo']
                if repo is not None:
                    self.assertTrue(repo.startswith('https://github.com/'),
                        f'{wallet["name"]} repo not GitHub: {repo}')

    def test_unique_names(self):
        all_names = []
        for cat in ('openSource', 'freemium'):
            names = [w['name'] for w in self.data[cat]]
            all_names.extend(names)
            self.assertEqual(len(names), len(set(names)),
                f'Duplicate names in {cat}')
        self.assertEqual(len(all_names), len(set(all_names)),
            'Duplicate names across categories')

    def test_fees_format(self):
        for cat in ('openSource', 'freemium'):
            for wallet in self.data[cat]:
                fees = wallet['fees']
                self.assertIsInstance(fees, str, f'{wallet["name"]} fees not string')
                self.assertTrue(len(fees) > 0, f'{wallet["name"]} fees empty')


class TestFilterLogic(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = load_data()
        cls.all_wallets = cls.data['openSource'] + cls.data['freemium']

    def test_no_filters_returns_all(self):
        result = filter_wallets(self.all_wallets, {})
        self.assertEqual(len(result), len(self.all_wallets))

    def test_filter_self_hostable(self):
        result = filter_wallets(self.all_wallets, {'selfHostable': True})
        self.assertTrue(all(w['selfHostable'] for w in result))
        # Layerz is not self-hostable (open source)
        layerz = [w for w in result if w['name'] == 'Layerz']
        self.assertEqual(len(layerz), 0)

    def test_filter_not_self_hostable(self):
        result = filter_wallets(self.data['openSource'], {'selfHostable': False})
        layerz = [w for w in result if w['name'] == 'Layerz']
        self.assertEqual(len(layerz), 1)

    def test_filter_nwc(self):
        result = filter_wallets(self.all_wallets, {'nwc': True})
        names = {w['name'] for w in result}
        self.assertIn('Coinos', names)
        self.assertIn('Lawallet', names)

    def test_filter_non_custodial_yes(self):
        result = filter_wallets(self.all_wallets, {'nonCustodial': 'yes'})
        names = {w['name'] for w in result}
        self.assertIn('LNW', names)
        self.assertIn('Blitz', names)  # Both includes yes
        self.assertIn('Shock', names)  # Both includes yes
        self.assertNotIn('Bankify', names)  # No

    def test_filter_non_custodial_optional(self):
        result = filter_wallets(self.all_wallets, {'nonCustodial': 'optional'})
        names = {w['name'] for w in result}
        self.assertIn('Coinos', names)
        self.assertIn('Nutstash', names)
        self.assertIn('Blitz', names)  # Both includes optional
        self.assertNotIn('Bankify', names)

    def test_search_by_name(self):
        result = filter_wallets(self.all_wallets, {}, 'Coinos')
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['name'], 'Coinos')

    def test_search_by_url(self):
        result = filter_wallets(self.all_wallets, {}, 'cashu')
        names = {w['name'] for w in result}
        self.assertIn('CASHU Wallet', names)

    def test_search_case_insensitive(self):
        result = filter_wallets(self.all_wallets, {}, 'COINOS')
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['name'], 'Coinos')

    def test_combined_filter_and_search(self):
        result = filter_wallets(self.all_wallets,
            {'nwc': True, 'ecash': True}, 'Coinos')
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['name'], 'Coinos')


class TestSortLogic(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = load_data()
        cls.all_wallets = cls.data['openSource'] + cls.data['freemium']

    def test_sort_by_name_asc(self):
        result = sort_wallets(self.all_wallets, 'name', 'asc')
        names = [w['name'] for w in result]
        self.assertEqual(names, sorted(names, key=str.lower))

    def test_sort_by_name_desc(self):
        result = sort_wallets(self.all_wallets, 'name', 'desc')
        names = [w['name'] for w in result]
        self.assertEqual(names, sorted(names, key=str.lower, reverse=True))

    def test_sort_by_self_hostable(self):
        """False (0) sorts before True (1) ascending; True before False descending."""
        result_asc = sort_wallets(self.all_wallets, 'selfHostable', 'asc')
        vals_asc = [w['selfHostable'] for w in result_asc]
        # Ascending: False(0) < True(1)
        self.assertFalse(vals_asc[0])   # first items should be False
        self.assertTrue(vals_asc[-1])   # last items should be True

        result_desc = sort_wallets(self.all_wallets, 'selfHostable', 'desc')
        vals_desc = [w['selfHostable'] for w in result_desc]
        # Descending: True(1) > False(0)
        self.assertTrue(vals_desc[0])
        self.assertFalse(vals_desc[-1])

    def test_sort_by_fees_asc(self):
        result = sort_wallets(self.data['openSource'], 'fees', 'asc')
        # Free should come first (0), then 0.1%, then 0-0.4%
        self.assertIn(result[0]['fees'].lower(), ['free'])


class TestHTMLStructure(unittest.TestCase):
    def test_html_exists(self):
        self.assertTrue(HTML_PATH.exists(), 'index.html missing')

    def test_html_has_tables(self):
        content = HTML_PATH.read_text()
        self.assertIn('<table>', content)
        self.assertIn('tbody-openSource', content)
        self.assertIn('tbody-freemium', content)

    def test_html_references_css(self):
        content = HTML_PATH.read_text()
        self.assertIn('style.css', content)

    def test_html_references_js(self):
        content = HTML_PATH.read_text()
        self.assertIn('app.js', content)


if __name__ == '__main__':
    print('\n  ⚡ Running Lightning Wallets Comparison Tests\n')
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(unittest.TestLoader().loadTestsFromModule(sys.modules[__name__]))
    print(f'\n  {"✅ All tests passed!" if result.wasSuccessful() else "❌ Some tests failed"}')
    sys.exit(0 if result.wasSuccessful() else 1)
