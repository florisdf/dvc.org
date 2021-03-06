import React, { Component } from 'react'
// nextjs
import Head from 'next/head'
// components
import Markdown from '../src/Documentation/Markdown/Markdown'
import Page from '../src/Page'
import SearchForm from '../src/SearchForm'
import DownloadButton from '../src/DownloadButton'
import Page404 from '../src/Page404'
import PerfectScrollbar from 'perfect-scrollbar';
import Hamburger from '../src/Hamburger';
// utils
import fetch from 'isomorphic-fetch'
import kebabCase from 'lodash.kebabcase'
import startCase from 'lodash.startcase'
import compact from 'lodash.compact'
import { scroller, animateScroll } from 'react-scroll'
import 'core-js/fn/array/find-index'
// styles
import styled from 'styled-components'
import { media, OnlyDesktop } from '../src/styles'
// json
import sidebar from '../src/Documentation/sidebar'

const HeadInjector = ({ sectionName = 'Documentation' }) => (
  <Head>
    <link rel="stylesheet" type="text/css" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/2.10.0/github-markdown.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/docsearch.js@2/dist/cdn/docsearch.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/perfect-scrollbar@1.4.0/css/perfect-scrollbar.min.css" />
    <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/docsearch.js@2/dist/cdn/docsearch.min.js" />
    <title>{sectionName} | Machine Learning Version Control System</title>
  </Head>
);

export default class Documentation extends Component {
  constructor() {
    super()
    this.state = {
      currentSection: 0,
      currentFile: null,
      markdown: '',
      headings: [],
      pageNotFound: false,
      isMenuOpen: false,
    }
  }

  componentDidMount() {
    this.loadStateFromURL();
    this.initDocsearch();
    window.addEventListener('popstate', this.loadStateFromURL);
    this.ps = new PerfectScrollbar('#sidebar-menu', {
      wheelPropagation: window.innerWidth <= 572,
    });
  }

  componentDidUpdate() {
    this.ps.update();
  }

  componentWillUnmount() {
    window.removeEventListener('popstate', this.loadStateFromURL)
  }

  initDocsearch = () => {
    docsearch({
      apiKey: '755929839e113a981f481601c4f52082', 
      indexName: 'dvc', 
      inputSelector: '#doc-search', 
      debug: false // Set debug to true if you want to inspect the dropdown 
    }); 
  }

  loadStateFromURL = () => {
    const { pathname } =  window.location

    // match section from URL
    const sectionURL = pathname.split('/')[2]
    const sectionIndex = sidebar.findIndex((section) => 
      (section.slug || kebabCase(section.name)) === sectionURL
    )
    
    if (sectionIndex === -1) {
      sectionURL 
        ? this.setState({ pageNotFound: true })
        : this.onSectionSelect(0)
    } else {
      // match file from URL
      const fileURL = pathname.split('/')[3]
      const fileIndex = sidebar[sectionIndex].files.findIndex((file) => 
        kebabCase(file.slice(0, -3)) === fileURL
      )

      if (fileIndex === -1) {
        fileURL 
        ? this.setState({ pageNotFound: true })
        : this.onSectionSelect(sectionIndex)        
      } else {
        this.loadFile({
          section: sectionIndex, 
          file: sidebar[sectionIndex].files[fileIndex], 
          parseHeadings: true,
          pageNotFound: false,
        })
      }
    }
  }

  getLinkHref = (section, file) => {
    const sectionSlug = sidebar[section].slug || kebabCase(sidebar[section].name)
    const fileSlug = file ? kebabCase(file.slice(0, -3)) : undefined
    return `/doc/${compact([sectionSlug, fileSlug]).join('/')}`;
  }

  setCurrentPath = (section, file) => {
    window.history.pushState(null, null, this.getLinkHref(section, file))
  }

  onSectionSelect = (section, e) => {
    e && e.preventDefault()
    const { indexFile, files } = sidebar[section]
    const file = indexFile || files[0]
    e && this.setCurrentPath(section, indexFile ? undefined : file)
    this.loadFile({ file, section, parseHeadings: false })
    this.setState({
      currentSection: section,
      pageNotFound: false,
    })
  }

  onFileSelect = (file, section, e) => {
    e && e.preventDefault();
    this.setCurrentPath(section, file)
    this.loadFile({ file, section, parseHeadings: true })
  }

  loadFile = ({ file, section, parseHeadings }) => {
    const { isMenuOpen } = this.state;
    fetch(`${sidebar[section].folder}/${file}`).then(res => {
      res.text().then(text => {
        this.setState({
          currentSection: section,
          currentFile: file,
          markdown: text,
          headings: [],
          pageNotFound: false,
          isMenuOpen: false,
        }, () => {
          this.scrollTop();
          parseHeadings && this.parseHeadings(text);
        })
      })
    })
  }

  parseHeadings = (text) => {
    const headingRegex = /\n(## \s*)(.*)/g;
    const matches = [];
    let match;
    do {
      match = headingRegex.exec(text);
      if (match) matches.push({
        text: match[2],
        slug: kebabCase(match[2])
      })
    } while (match);

    this.setState({ headings: matches }, this.autoScroll)
  }

  autoScroll = () => {
    const { hash } =  window.location
    if (hash) this.scrollToLink(hash)
  }

  scrollToLink = (href) => {
    scroller.scrollTo(href.slice(1), {
      duration: 600,
      offset: -85,
      delay: 0,
      smooth: 'ease',
      containerId: 'bodybag',
    })
  }

  scrollTop = () => {
    animateScroll.scrollTo(0, {
      duration: 300,
      offset: -85,
      delay: 0,
      smooth: 'ease',
      containerId: 'bodybag'
    })
  }

  renderMenu = ({ currentSection, currentFile, headings }) => (
    <SectionLinks>
      {
        sidebar.map(({ name, files = [], labels = {}, indexFile }, index) => {
          const isSectionActive = currentSection === index;
          return (
            <div key={index}>
              <SectionLink
                level={1} 
                href={this.getLinkHref(index, indexFile ? undefined : files[0])}
                onClick={(e) => this.onSectionSelect(index, e)}
                className={isSectionActive ? 'docSearch-lvl0' : ''} 
                isActive={isSectionActive}
              >
                {name}
              </SectionLink>

              {/* Section Files */}
              <Collapse isOpen={isSectionActive} items={files.length + headings.length}>
                {files && files.map((file, fileIndex) => {
                  const isFileActive = currentFile === file;
                  return (
                    <div key={`file-${fileIndex}`}>
                      <SectionLink 
                        level={2}
                        href={this.getLinkHref(index, file)}
                        onClick={(e) => this.onFileSelect(file, index, e)}
                        isActive={isFileActive}
                      >
                        {labels[file] || startCase(file.slice(0, -3))}
                      </SectionLink>

                      {/* File Headings */}
                      <Collapse isOpen={isFileActive} items={headings.length}>
                        {!!headings.length && headings.map(({ text, slug }, headingIndex) => (
                          <SectionLink 
                            level={3}
                            key={`link-${headingIndex}`}
                            onClick={() => this.scrollToLink('#' + slug)}
                            href={`#${slug}`}
                          >
                            {text}
                          </SectionLink>
                        ))}
                      </Collapse>
                    </div>
                  )}
                )}
              </Collapse>
            </div>
          )
        })
      }
    </SectionLinks>
  );

  toggleMenu = () => {
    this.setState((prevState) => ({
      isMenuOpen: !prevState.isMenuOpen
    }));
  }

  render() {
    const { currentSection, currentFile, markdown, pageNotFound, isMenuOpen } = this.state
    const githubLink = `https://github.com/iterative/dvc.org/blob/master${sidebar[currentSection].folder}/${currentFile}`
    const sectionName = sidebar[currentSection].name;

    return (
      <Page stickHeader={true}>
        <HeadInjector sectionName={sectionName} />
        <Container >
          <Backdrop onClick={this.toggleMenu} visible={isMenuOpen} />
          <SideToggle onClick={this.toggleMenu} isMenuOpen={isMenuOpen}>
            <Hamburger />
          </SideToggle>
          <Side isOpen={isMenuOpen}>
            <SearchArea>
              <SearchForm />
            </SearchArea>
            <Menu id="sidebar-menu">
              <Sections>
                {this.renderMenu(this.state)}
              </Sections>
              <OnlyDesktop>
                <SideFooter>
                  <DownloadButton openTop />
                </SideFooter>
              </OnlyDesktop>
            </Menu>
          </Side>

          {pageNotFound
            ? <Page404 />
            : (
              <Markdown
                markdown={markdown}
                githubLink={githubLink}
                section={currentSection}
                file={currentFile}
                onFileSelect={this.onFileSelect}
              />
            )}
        </Container>
      </Page>
    )
  }
}

const Container = styled.div`
  display: flex;
  flex-direction: row;
  max-width: 1005px;
  margin: 0 auto;
  background: white;
  z-index: 2;

  &:before {
    content: '';
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 50%;
    background-color: #eef4f8;
    z-index: -1;
  }
`
const Backdrop = styled.div`
  display: none;

  ${media.phablet`
    display: block;
    opacity: 0;
    pointer-events: none;
    transition: opacity .3s linear;

    ${props => 
      props.visible &&
      `
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      background-color: rgba(0, 0, 0, 0.4);
      z-index: 1;
      opacity: 1;
      pointer-events: all;    
    `} 
  `};
`;

const Side = styled.div`
  flex-basis: 33.7%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  background-color: #eef4f8;

  ${media.phablet`
    position: fixed;
    display: block;
    z-index: 2;
    top: 78px;
    bottom: 0;
    left: 0;
    right: 60px;
    box-shadow: rgba(0, 0, 0, 0.14) 0px 0px 4px, rgba(0, 0, 0, 0.28) 0px 4px 8px;
    transform: translateX(-110%);
    transition: transform .35s ease;

    ${props => 
      props.isOpen &&
      `
      transform: translateX(0);
    `} 
  `};
`

const SearchArea = styled.div`
  height: 60px;
  display: flex;
  align-items: center;
  background-color: #eef4f8;
  z-index: 10;
  position: sticky;
  top: 0;

  ${media.phablet`
    position: relative;
    padding: 0 20px;
  `};

  form {
    height: 40px;
  }
`

const Menu = styled.div`
  position: sticky;
  top: 60px;
  width: 100%;
  height: calc(100vh - 138px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;

  ${media.phablet`
    width: auto;
    position: relative;
    margin: 0;
    top: 0;
    overflow-y: auto;
    margin-left: 20px;
  `};
`

const Sections = styled.div`
  margin-bottom: 25px;
  margin-top: 10px;
  min-width: 280px;
`

const SectionLinks = styled.div`
  @media (max-width: 768px) {
    position: relative;
  }
`

const SectionLink = styled.a`
  display: block;
  position: relative;
  font-size: 18px;
  font-weight: 500;
  color: #b0b8c5;
  text-decoration: none;
  font-weight: 400;
  line-height: 26px;
  min-height: 26px;
  padding-bottom: 5px;
  padding-left: 15px;
  cursor: pointer;
  margin: 0;

  &:hover {
    color: #3c3937;
  }

  &::before {
    content: '';
    display: block;
    position: absolute;
    width: 8px;
    height: 5px;
    background: url('/static/img/triangle_dark.svg') no-repeat center center;
    left: 0px;
    top: 10px;

    ${props =>
      props.isActive &&
      `
      transform: rotate(-90deg);
    `} 
  }

  ${props =>
    props.level === 1 &&
    `
    margin-left: 5px;
  `} 
  
  ${props =>
    props.level === 2 &&
    `
      margin-left: 30px;
  `};
  
  ${props =>
    props.level === 3 &&
    `
      margin-left: 50px;

      &::before {
        display: none;
      }
  `};

  ${props =>
    props.isActive &&
    `
    color: #40364d;
	`};
`

const Collapse = styled.div`
  height: 0;
  overflow: hidden;
  height: ${({ isOpen, items }) => isOpen ? items * 31 : 0}px;
  transition: height .3s linear;
`

const SideFooter = styled.div`
  margin-top: 30px;
  padding-bottom: 30px;
`

const SideToggle = styled.div`
  display: none;
  position: fixed;
  z-index: 2;
  left: 8px;
  bottom: 20px;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0px 9px 0 rgba(0, 0, 0, 0.15);
  transition: transform .3s ease;
  justify-content: center;
  align-items: center;

  ${media.phablet`
    display: flex;

    > div {
      transform: scale(0.75);
    }
  `};

  ${({ isMenuOpen }) => isMenuOpen && `
    transform: translateX(calc(100vw - 60px));
  `};
`
