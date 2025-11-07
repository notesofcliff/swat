export async function install(swat) {
  swat.registerComponent('hello-widget', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello from plugin!';
    return div;
  });
  swat.log('info', 'Hello plugin installed');
}