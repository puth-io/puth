import React, { useEffect, useRef } from 'react';

import './Code.css';

import prism from 'prismjs';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-php';

import 'prismjs/plugins/line-highlight/prism-line-highlight.min';
import 'prismjs/plugins/line-highlight/prism-line-highlight.min.css';

import 'prismjs/plugins/line-numbers/prism-line-numbers.min';
import 'prismjs/plugins/line-numbers/prism-line-numbers.min.css';

import 'prismjs/themes/prism-tomorrow.min.css';

export default function Code({ children = null, code = null, language, lineNumbers = null, highlight = null }) {
  let ref = useRef();

  useEffect(() => {
    if (ref.current) {
      prism.highlightElement(ref.current);
    }
  }, [ref.current, code]);

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
