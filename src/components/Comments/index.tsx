import { useEffect } from 'react';

export function Comments() {
  useEffect(() => {
    let script = document.createElement('script');
    let anchor = document.getElementById('inject-comments-for-utterances');
    script.setAttribute('src', 'https://utteranc.es/client.js');
    script.setAttribute('crossorigin', 'anonymous');
    script.async = true;
    script.setAttribute('repo', 'NeoticoZ/utterances-comments');
    script.setAttribute('issue-term', 'pathname');
    script.setAttribute('theme', 'photon-dark');
    anchor.appendChild(script);
  }, []);

  return <div id="inject-comments-for-utterances"></div>;
}
