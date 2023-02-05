import React, { useEffect, useRef } from 'react';
import { throttle } from '../../Misc/Util';

import './Code.css';

import prism from 'prismjs';

// Needed for some languages
import 'prismjs/components/prism-markup-templating';

// Load all languages that we might need
import 'prismjs/components/prism-c.min';
import 'prismjs/components/prism-cpp.min';
import 'prismjs/components/prism-csharp.min';
import 'prismjs/components/prism-css.min';
import 'prismjs/components/prism-dart.min';
import 'prismjs/components/prism-diff.min';
import 'prismjs/components/prism-ejs.min';
import 'prismjs/components/prism-elixir.min';
import 'prismjs/components/prism-elm.min';
import 'prismjs/components/prism-flow.min';
import 'prismjs/components/prism-go.min';
import 'prismjs/components/prism-graphql.min';
import 'prismjs/components/prism-handlebars.min';
import 'prismjs/components/prism-ignore.min';
import 'prismjs/components/prism-ini.min';
import 'prismjs/components/prism-java.min';
import 'prismjs/components/prism-javascript.min';
import 'prismjs/components/prism-jq.min';
import 'prismjs/components/prism-json.min';
import 'prismjs/components/prism-json5.min';
import 'prismjs/components/prism-jsonp.min';
import 'prismjs/components/prism-jsx.min';
import 'prismjs/components/prism-kotlin.min';
import 'prismjs/components/prism-less.min';
import 'prismjs/components/prism-log.min';
import 'prismjs/components/prism-markdown.min';
import 'prismjs/components/prism-nginx.min';
import 'prismjs/components/prism-objectivec.min';
import 'prismjs/components/prism-php.min';
import 'prismjs/components/prism-php-extras.min';
import 'prismjs/components/prism-python.min';
import 'prismjs/components/prism-rust.min';
import 'prismjs/components/prism-sass.min';
import 'prismjs/components/prism-scss.min';
import 'prismjs/components/prism-swift.min';
import 'prismjs/components/prism-toml.min';
import 'prismjs/components/prism-tsx.min';
import 'prismjs/components/prism-typescript.min';
import 'prismjs/components/prism-wasm.min';
import 'prismjs/components/prism-yaml.min';

import 'prismjs/plugins/line-highlight/prism-line-highlight.min';
import 'prismjs/plugins/line-highlight/prism-line-highlight.min.css';

import 'prismjs/plugins/line-numbers/prism-line-numbers.min';
import 'prismjs/plugins/line-numbers/prism-line-numbers.min.css';

import 'prismjs/themes/prism-tomorrow.min.css';
import { Events } from '../../../main';

export default function Code({
  children = null,
  code = null,
  language = '',
  lineNumbers = null,
  highlight = '',
  file = '',
}) {
  let ref: any = useRef();

  if (!language) {
    language = guessLanguageOnFilename(file);
  }

  let highlightFunc = () => {
    if (ref.current) {
      prism.highlightElement(ref.current);
    }
  };

  let highlightFuncThrottled = throttle(highlightFunc);

  useEffect(() => {
    highlightFunc();
  }, [ref.current, code]);

  useEffect(() => {
    window.addEventListener('resize', highlightFuncThrottled);
    Events.on('layout:resize', highlightFuncThrottled);

    return () => {
      window.removeEventListener('resize', highlightFuncThrottled);
      Events.off('layout:resize', highlightFuncThrottled);
    };
  }, []);

  return (
    <pre
      className={`language-${language} ${lineNumbers && 'line-numbers'}`}
      data-line={highlight}
      data-start={lineNumbers}
    >
      <code ref={ref} className={`language-${language}`}>
        {children ?? code}
      </code>
    </pre>
  );
}

export const fileEndingToLanguage: any = {};

export function guessLanguageOnFilename(file: string): string {
  for (let ending of Object.keys(fileEndingToLanguage)) {
    if (file.endsWith(ending)) {
      return fileEndingToLanguage[ending] ?? '';
    }
  }

  // default handler works for: php, css, js, jsx, ts, tsx, json
  return file.split('.').pop() ?? '';
}
