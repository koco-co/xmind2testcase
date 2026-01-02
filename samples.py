"""
Date: 2021-01-21 15:10:26
Author: Poco Ray
FilePath: /xmind2testcase_2025/samples.py
Description: Sample script demonstrating XMind to testcase conversion.
"""
# !/usr/bin/env python
# -*- coding: utf-8 -*-
import json
import logging
import xmind
from xmind2testcase.testlink import xmind_to_testlink_xml_file
from xmind2testcase.utils import (
    get_xmind_testcase_list,
    get_xmind_testsuite_list,
    xmind_testcase_to_json_file,
    xmind_testsuite_to_json_file,
)
from xmind2testcase.zentao import xmind_to_zentao_csv_file

logging.basicConfig(level=logging.INFO)


def main() -> None:
    """Main function to demonstrate XMind file conversion.

    Converts an XMind file to various testcase formats:
    - Zentao CSV file
    - TestLink XML file
    - TestSuite JSON file
    - TestCase JSON file
    - Raw JSON data
    """
    xmind_file = 'docs/xmind_testcase_template_v1.1.xmind'
    print(f'Start to convert XMind file: {xmind_file}')

    # 1. Testcases import file
    # (1) Zentao
    zentao_csv_file = xmind_to_zentao_csv_file(xmind_file)
    print(f'Convert XMind file to zentao csv file successfully: '
          f'{zentao_csv_file}')
    # (2) TestLink
    testlink_xml_file = xmind_to_testlink_xml_file(xmind_file)
    print(f'Convert XMind file to testlink xml file successfully: '
          f'{testlink_xml_file}')

    # 2. Testcases JSON file
    # (1) TestSuite
    testsuite_json_file = xmind_testsuite_to_json_file(xmind_file)
    print(f'Convert XMind file to testsuite json file successfully: '
          f'{testsuite_json_file}')
    # (2) TestCase
    testcase_json_file = xmind_testcase_to_json_file(xmind_file)
    print(f'Convert XMind file to testcase json file successfully: '
          f'{testcase_json_file}')

    # 3. Test dict/JSON data
    # (1) TestSuite
    testsuites = get_xmind_testsuite_list(xmind_file)
    print('Convert XMind to testsuits dict data:\n'
          f'{json.dumps(testsuites, indent=2, separators=(",", ": "), ensure_ascii=False)}')
    # (2) TestCase
    testcases = get_xmind_testcase_list(xmind_file)
    print('Convert Xmind to testcases dict data:\n'
          f'{json.dumps(testcases, indent=4, separators=(",", ": "), ensure_ascii=False)}')
    # (3) XMind file
    workbook = xmind.load(xmind_file)
    print('Convert XMind to Json data:\n'
          f'{json.dumps(workbook.getData(), indent=2, separators=(",", ": "), ensure_ascii=False)}')

    print('Finished conversion, Congratulations!')


if __name__ == '__main__':
    main()
