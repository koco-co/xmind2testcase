#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Setup script for xmind2testcase package."""
import io
import os
import sys
from shutil import rmtree
from typing import Dict, Any

from setuptools import Command, find_packages, setup

about: Dict[str, Any] = {}
here = os.path.abspath(os.path.dirname(__file__))
with io.open(os.path.join(here, 'xmind2testcase', '__about__.py'),
             encoding='utf-8') as f:
    exec(f.read(), about)

with io.open('README.md', encoding='utf-8') as f:
    long_description = f.read()

install_requires = [
    "xmind",
    "flask",
    "arrow",
]


class PyPiCommand(Command):
    """Build and publish this package and make a tag.

    Support: python setup.py pypi
    Copied from requests_html
    """
    user_options = []

    @staticmethod
    def status(s: str) -> None:
        """Print things in green color.

        Args:
            s: Message to print.
        """
        print(f'\033[0;32m{s}\033[0m')

    def initialize_options(self) -> None:
        """Override base class method."""
        pass

    def finalize_options(self) -> None:
        """Override base class method."""
        pass

    def run(self) -> None:
        """Execute the PyPi upload command."""
        self.status('Building Source and Wheel (universal) distribution...')
        os.system(f'{sys.executable} setup.py sdist bdist_wheel --universal')

        self.status('Uploading the package to PyPi via Twine...')
        os.system('twine upload dist/*')

        self.status('Publishing git tags...')
        os.system(f"git tag v{about['__version__']}")
        os.system('git push --tags')

        try:
            self.status('Removing current build artifacts...')
            rmtree(os.path.join(here, 'dist'))
            rmtree(os.path.join(here, 'build'))
            rmtree(os.path.join(here, 'xmind2testcase.egg-info'))
        except OSError:
            pass

        self.status('Congratulations! Upload PyPi and publish git tag '
                    'successfully...')
        sys.exit()


setup(
    name=about['__title__'],
    version=about['__version__'],
    description=about['__description__'],
    long_description=long_description,
    long_description_content_type='text/markdown',
    keywords=about['__keywords__'],
    author=about['__author__'],
    author_email=about['__author_email__'],
    url=about['__url__'],
    license=about['__license__'],
    packages=find_packages(exclude=['tests', 'test.*', 'docs']),
    package_data={
        '': ['README.md'],
        'webtool': ['static/*', 'static/css/*', 'static/guide/*',
                    'templates/*', 'schema.sql'],
    },
    install_requires=install_requires,
    extras_require={},
    python_requires='>=3.0, <4',
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    entry_points={
        'console_scripts': [
            'xmind2testcase=xmind2testcase.cli:cli_main',
        ]
    },
    cmdclass={
        'pypi': PyPiCommand
    }
)
