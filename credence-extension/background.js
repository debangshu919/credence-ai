// CredenceAI — Background Service Worker

const BACKEND_URL = 'https://credence-ai-backend-rzip.onrender.com';

// ─────────────────────────────────────────────────────────────
// Installation
// ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'verify-selection',
    title: 'Verify with CredenceAI',
    contexts: ['selection']
  });

  console.log('CredenceAI Fact Checker installed.');
});


// ─────────────────────────────────────────────────────────────
// Context menu
// ─────────────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'verify-selection' || !tab?.id) {
    return;
  }

  const message = {
    command: 'run_fact_check',
    text: info.selectionText || ''
  };

  try {
    await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    console.log(
      'Content script not available. Injecting it into the page...'
    );

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content.css']
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      await chrome.tabs.sendMessage(tab.id, message);

    } catch (injectionError) {
      console.error(
        'Failed to inject CredenceAI content script:',
        injectionError
      );
    }
  }
});


// ─────────────────────────────────────────────────────────────
// Backend verification
// ─────────────────────────────────────────────────────────────
// Backend verification
// ─────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.command !== 'backend_fact_check') {
    return;
  }

  if (!message.text) {
    return;
  }

  const tabId = sender.tab?.id;

  if (!tabId) {
    console.error('No tab ID available for fact check.');
    return;
  }

  runBackendVerification(message.text, tabId);
});


// ─────────────────────────────────────────────────────────────
// Fetch Render backend + stream SSE
// ─────────────────────────────────────────────────────────────

async function runBackendVerification(text, tabId) {
  try {
    console.log('CredenceAI → Sending request to Render...');

    const response = await fetch(`${BACKEND_URL}/api/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text
      })
    });

    console.log(
      'CredenceAI → Backend response:',
      response.status
    );

    if (!response.ok) {
      throw new Error(`Backend returned HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Backend returned no response stream.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split('\n\n');

      buffer = chunks.pop() || '';

      for (const chunk of chunks) {
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) {
            continue;
          }

          const dataStr = line
            .replace(/^data:\s*/, '')
            .trim();

          if (!dataStr) {
            continue;
          }

          try {
            const parsed = JSON.parse(dataStr);

            console.log(
              'CredenceAI → Pipeline event:',
              parsed.step,
              parsed.status
            );

            chrome.tabs.sendMessage(tabId, {
              command: 'fact_check_progress',
              data: parsed
            }).catch(() => {});
            
          } catch (parseError) {
            console.warn(
              'Could not parse SSE event:',
              dataStr
            );
          }
        }
      }
    }

    console.log('CredenceAI → Verification stream completed.');

  } catch (error) {
    console.error(
      'CredenceAI → Backend verification failed:',
      error
    );

    chrome.tabs.sendMessage(tabId, {
      command: 'fact_check_error',
      error: error.message || 'Failed to connect to backend.'
    }).catch(() => {});
  }
}