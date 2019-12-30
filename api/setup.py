from setuptools import setup
with open('requirements.txt') as f:
    requirements = f.read().splitlines()

setup(
    name='dataviewerapi',
    version='0.0.1',
    packages=['dataviewerapi', 'dataviewerapi.routes'],
    url='http://sae.wustl.edu',
    license='GPL-3.0+',
    author='Connor Monahan',
    author_email='cma2714@gmail.com',
    description='API for storing and analyzing car log files',
    install_requires=requirements
)
