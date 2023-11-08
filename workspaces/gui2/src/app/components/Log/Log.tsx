import { FunctionComponent } from 'react';
import './Log.scss';

type LogProps = {
  log: any;
};

const Log: FunctionComponent<LogProps> = ({ log }) => {
  let isError = log.messageType === 'error';
  let message =
    isError && log.args.length === 0
      ? log.text
      : log.args.map((a: any) => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');

  return (
    <tr className={'log'} data-messagetype={log.messageType}>
      <td />
      <td colSpan={5}>
        <div>
          <div className="fst-italic small">console message (type: {log.messageType})</div>
          <div className={'small fw-bold'}>{message}</div>
          {isError && (
            <>
              <table className="small">
                <tbody>
                  {log.stackTrace.map((trace: any, idx: number) => (
                    <tr key={idx}>
                      <td>
                        {trace.lineNumber}
                        {trace.columnNumber && ':'}
                        {trace.columnNumber}
                      </td>
                      <td className={'text-danger'}>{trace.url}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

export default Log;
