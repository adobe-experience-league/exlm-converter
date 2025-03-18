import { JSDOM } from 'jsdom';

const { window } = new JSDOM();
global.window = window;
global.document = window.document;
global.Node = window.Node;
global.NodeFilter = window.NodeFilter;
