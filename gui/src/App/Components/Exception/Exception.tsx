import React, { useState } from 'react';
import Code from '../Code/Code';
import { Split, Trace } from '../Preview/Preview';

export const Exception = ({ exception }) => {
  let { runner, origin, lang } = exception.data;
  let { code, file, files, line, message, trace } = exception.data.exception;
  let [active, setActive] = useState('default');

  // Calculate previewed lines
  let defaultFile = files.find((iter) => iter.path === file);
  let lines = defaultFile?.content?.split('\n');

  let lineOffset = line - (defaultFile?.offset ?? 0);

  let previewStart = lineOffset - 5;
  let previewEnd = lineOffset + 5;
  previewStart = previewStart < 0 ? 0 : previewStart;
  previewEnd = previewEnd >= lines ? lines : previewEnd;

  let preview = lines.slice(previewStart, previewEnd);

  // Cleanup puth exceptions
  if (message.includes('[Puth StackTrace]') && message.includes('... (truncated)')) {
    let split = message.split('[Puth StackTrace]');
    let rest = split[1].split('... (truncated)');

    message = [split[0], ...rest.slice(1)].join('').trim();
  }

  let hasFiles = files?.length > 0;

  return (
    <>
      <div className={'footer'}>
        <div className={'tab-menu'}>
          <div className={`tab-button ${active === 'default' && 'active'}`} onClick={(_) => setActive('default')}>
            Default
          </div>
          {hasFiles && (
            <div className={`tab-button ${active === 'files' && 'active'}`} onClick={(_) => setActive('files')}>
              Files
            </div>
          )}
        </div>
        <div className={'ml-auto'}>
          {`Origin: ${origin}`}
          <Split />
          {`Runner: ${runner}`}
          <Split />
          {`Language: ${lang}`}
        </div>
      </div>
      <div className={'overflow-auto'}>
        {active === 'default' && (
          <div className={'border-top border-default p-2'}>
            <Code language={'log'}>{message}</Code>
            <Code
              code={preview.join('\n')}
              language={'php'}
              lineNumbers={previewStart + (defaultFile?.offset ?? 0) + 1}
              highlight={line}
            />
            <Trace trace={trace} />
          </div>
        )}
        {active === 'files' && <Files files={files} />}
      </div>
    </>
  );
};

export const Files = ({ files }) =>
  files.map((file, idx) => (
    <div key={idx}>
      <div className={'footer'}>{file.path}</div>
      <Code code={file.content} language={file?.language} file={file.path} lineNumbers={1 + (file?.offset ?? 0)} />
    </div>
  ));
