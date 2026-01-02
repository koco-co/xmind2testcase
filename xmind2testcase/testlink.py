#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Convert XMind file to TestLink testcase XML file."""
import logging
import os
from io import BytesIO
from typing import List, Optional, Union
from xml.dom import minidom
from xml.etree.ElementTree import Comment, Element, ElementTree, SubElement
from xml.sax.saxutils import escape

from xmind2testcase import const
from xmind2testcase.metadata import TestCase, TestSuite
from xmind2testcase.parser import config
from xmind2testcase.utils import get_absolute_path, get_xmind_testsuites


def xmind_to_testlink_xml_file(
    xmind_file: str,
    is_all_sheet: bool = True
) -> str:
    """Convert an XMind sheet to a TestLink XML file.

    Args:
        xmind_file: Path to the XMind file.
        is_all_sheet: If True, convert all sheets; if False, only the first.

    Returns:
        Path to the created TestLink XML file.
    """
    xmind_file = get_absolute_path(xmind_file)
    logging.info('Start converting XMind file(%s) to testlink file...',
                 xmind_file)
    testsuites = get_xmind_testsuites(xmind_file)
    if not is_all_sheet and testsuites:
        testsuites = [testsuites[0]]

    xml_content = testsuites_to_xml_content(testsuites)
    testlink_xml_file = xmind_file[:-6] + '.xml'

    if os.path.exists(testlink_xml_file):
        logging.info('the testlink xml file already exists, return it '
                     'directly: %s', testlink_xml_file)
        return testlink_xml_file

    with open(testlink_xml_file, 'w', encoding='utf-8') as f:
        pretty_content = minidom.parseString(xml_content).toprettyxml(
            indent='\t')
        f.write(pretty_content)
        logging.info('convert XMind file(%s) to a testlink xml file(%s) '
                     'successfully!', xmind_file, testlink_xml_file)

    return testlink_xml_file


def testsuites_to_xml_content(testsuites: List[TestSuite]) -> bytes:
    """Convert the testsuites to TestLink XML file format.

    Args:
        testsuites: List of TestSuite objects.

    Returns:
        XML content as bytes.
    """
    root_element = Element(const.TAG_TESTSUITE)

    for testsuite in testsuites:
        suite_element = SubElement(root_element, const.TAG_TESTSUITE)
        suite_element.set(const.ATTR_NMAE, testsuite.name)
        gen_text_element(suite_element, const.TAG_DETAILS, testsuite.details)

        for sub_suite in testsuite.sub_suites or []:
            if is_should_skip(sub_suite.name):
                continue
            sub_suite_element = SubElement(suite_element,
                                           const.TAG_TESTSUITE)
            sub_suite_element.set(const.ATTR_NMAE, sub_suite.name)
            gen_text_element(sub_suite_element, const.TAG_DETAILS,
                             sub_suite.details)
            gen_testcase_element(sub_suite_element, sub_suite)

    testlink = ElementTree(root_element)
    content_stream = BytesIO()
    testlink.write(content_stream, encoding='utf-8', xml_declaration=True)
    return content_stream.getvalue()


def gen_testcase_element(
    suite_element: Element,
    suite: TestSuite
) -> None:
    """Generate testcase elements for a test suite.

    Args:
        suite_element: Parent XML element for test cases.
        suite: TestSuite object containing test cases.
    """
    for testcase in suite.testcase_list or []:
        if is_should_skip(testcase.name):
            continue

        testcase_element = SubElement(suite_element, const.TAG_TESTCASE)
        testcase_element.set(const.ATTR_NMAE, testcase.name)

        gen_text_element(testcase_element, const.TAG_VERSION,
                         str(testcase.version))
        gen_text_element(testcase_element, const.TAG_SUMMARY,
                         testcase.summary)
        gen_text_element(testcase_element, const.TAG_PRECONDITIONS,
                         testcase.preconditions)
        gen_text_element(testcase_element, const.TAG_EXECUTION_TYPE,
                         _convert_execution_type(testcase.execution_type))
        gen_text_element(testcase_element, const.TAG_IMPORTANCE,
                         _convert_importance(testcase.importance))

        estimated_exec_duration_element = SubElement(
            testcase_element, const.TAG_ESTIMATED_EXEC_DURATION)
        estimated_exec_duration_element.text = str(
            testcase.estimated_exec_duration)

        status = SubElement(testcase_element, const.TAG_STATUS)
        status.text = (str(testcase.status)
                       if testcase.status in (1, 2, 3, 4, 5, 6, 7)
                       else '7')

        gen_steps_element(testcase_element, testcase)


def gen_steps_element(
    testcase_element: Element,
    testcase: TestCase
) -> None:
    """Generate steps elements for a test case.

    Args:
        testcase_element: Parent XML element for test steps.
        testcase: TestCase object containing test steps.
    """
    if testcase.steps:
        steps_element = SubElement(testcase_element, const.TAG_STEPS)

        for step in testcase.steps:
            if is_should_skip(step.actions):
                continue

            step_element = SubElement(steps_element, const.TAG_STEP)
            gen_text_element(step_element, const.TAG_STEP_NUMBER,
                             str(step.step_number))
            gen_text_element(step_element, const.TAG_ACTIONS, step.actions)
            gen_text_element(step_element, const.TAG_EXPECTEDRESULTS,
                             step.expectedresults)
            gen_text_element(step_element, const.TAG_EXECUTION_TYPE,
                             _convert_execution_type(step.execution_type))


def gen_text_element(
    parent_element: Element,
    tag_name: str,
    content: Optional[str]
) -> None:
    """Generate an element's text content with CDATA.

    Args:
        parent_element: Parent XML element.
        tag_name: Name of the child element tag.
        content: Text content to add (may be None).
    """
    if is_should_parse(content):
        child_element = SubElement(parent_element, tag_name)
        element_set_text(child_element, content)


def element_set_text(element: Element, content: str) -> None:
    """Set text content for an XML element with CDATA.

    Args:
        element: XML element to set text for.
        content: Text content to set.
    """
    # Retain HTML tags in content
    content = escape(content, entities={'\r\n': '<br />'})
    # Replace new line for *nix system
    content = content.replace('\n', '<br />')
    # Add the line break in source to make it readable
    content = content.replace('<br />', '<br />\n')

    # Add CDATA for an element
    escaped_content = content.replace(']]>', ']]]]><![CDATA[>')
    element.append(Comment(f' --><![CDATA[{escaped_content}]]> <!-- '))


def is_should_parse(content: Optional[str]) -> bool:
    """Check if content should be parsed into XML.

    An element that has a string content and doesn't start with ignore
    character should be parsed.

    Args:
        content: Content to check.

    Returns:
        True if content should be parsed, False otherwise.
    """
    return (isinstance(content, str) and
            content.strip() != '' and
            content[0] not in config['ignore_char'])


def is_should_skip(content: Optional[str]) -> bool:
    """Check if a testsuite/testcase/teststep should be skipped.

    A testsuite/testcase/teststep should be skipped if:
    1. Content is empty
    2. Content starts with ignore character

    Args:
        content: Content to check.

    Returns:
        True if content should be skipped, False otherwise.
    """
    return (content is None or
            not isinstance(content, str) or
            content.strip() == '' or
            content[0] in config['ignore_char'])


def _convert_execution_type(value: Union[int, str]) -> str:
    """Convert execution type to TestLink format.

    Args:
        value: Execution type value (1 or 2, or string representation).

    Returns:
        String representation: '1' for manual, '2' for automated.
    """
    manual_values = (1, '手动', '手工', 'manual', 'Manual')
    automated_values = (2, '自动', '自动化', '自动的', 'Automate',
                        'Automated', 'Automation', 'automate',
                        'automated', 'automation')

    if value in manual_values:
        return '1'
    elif value in automated_values:
        return '2'
    else:
        return '1'


def _convert_importance(value: int) -> str:
    """Convert importance value to TestLink format.

    Args:
        value: Importance value (1=high, 2=middle, 3=low).

    Returns:
        String representation: '3' for high, '2' for middle, '1' for low.
    """
    mapping = {1: '3', 2: '2', 3: '1'}
    return mapping.get(value, '2')
