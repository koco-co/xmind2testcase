#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Constants for TestLink XML format tags and attributes."""

# XML tags
TAG_XML = "xml"

TAG_TESTSUITE = "testsuite"
TAG_DETAILS = "details"

TAG_TESTCASE = "testcase"
TAG_VERSION = "version"
TAG_SUMMARY = "summary"
TAG_PRECONDITIONS = "preconditions"
TAG_IMPORTANCE = "importance"
TAG_ESTIMATED_EXEC_DURATION = "estimated_exec_duration"
TAG_STATUS = "status"
TAG_IS_OPEN = "is_open"
TAG_ACTIVE = "active"
TAG_STEPS = "steps"
TAG_STEP = "step"
TAG_STEP_NUMBER = "step_number"
TAG_ACTIONS = "actions"
TAG_EXPECTEDRESULTS = "expectedresults"
TAG_EXECUTION_TYPE = "execution_type"

# XML attributes
ATTR_NMAE = "name"  # Note: typo in original (should be NAME)
ATTR_ID = "id"
ATTR_INTERNALID = "internalid"
