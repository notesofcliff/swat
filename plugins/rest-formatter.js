export async function install(swat) {
  // Register a component for formatted response display
  swat.registerComponent('formatted-response', () => {
    const div = document.createElement('div');
    div.innerHTML = '<pre id="formatted"></pre>';
    return div;
  });

  // Listen for responses and format them
  swat.eventBus.on('response:received', (result) => {
    if (result.body) {
      try {
        const parsed = JSON.parse(result.body);
        swat.log('info', 'Response formatted as JSON');
        // Could emit a formatted event or update a component
      } catch (e) {
        swat.log('info', 'Response is not JSON');
      }
    }
  });

  swat.log('info', 'REST Formatter plugin installed');
}