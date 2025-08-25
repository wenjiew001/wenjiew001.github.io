console.log('gallery-group.js loaded');

var IMG_DATA = "/photos/photos.json";
var IMG_ROOT = "https://cdn.jsdelivr.net/gh/wenjiew-astro/gallery@main/gallery/";
var W = (window.innerWidth || document.documentElement.clientWidth) < 768 ? 145 : 250;

function enc(s){ return encodeURIComponent(s) }
function build(dir, file){ return IMG_ROOT + enc(dir) + '/' + enc(file) }
function q(k){ return new URLSearchParams(location.search).get(k) || '' }

$(function(){
  var $grid = $(".ImageGrid");
  if (!$grid.length) return;

  $.getJSON(IMG_DATA).done(function(list){
    if (!Array.isArray(list) || !list.length) { 
      $grid.html('<p style="color:#999">暂无相册</p>'); 
      return; 
    }

    // 取参数；没有则默认第一组（但只有在确实没带参数时才兜底）
    var group = q('group');
    if (!group) {
      group = list[0].name;
      history.replaceState(null, '', '?group=' + encodeURIComponent(group));
    }

    // 兼容中文参数：URLSearchParams 已解码，这里不再反复解码
    var item = list.find(function(x){ return x && x.name === group; });
    if (!item) { 
      $grid.html('<p style="color:#c00">未找到分组：'+ group +'</p>'); 
      return; 
    }

    // 找到分组后（item 存在）——把页头标题改成组名，并锁定
    (function forceSiteTitle(name) {
      // 1) 浏览器标签
      document.title = name + ' - 相册';

      // 2) 页头大标题 #site-title
      var el = document.querySelector('#page-site-info #site-title');
      if (!el) return;

      // 重复多次以覆盖主题的晚注入
      function apply() { el.textContent = name; }
      [0, 30, 80, 200, 500, 1000, 2000].forEach(function(t){ setTimeout(apply, t); });

      // 监听这个节点，一旦被改回就再写一次
      try {
        var mo = new MutationObserver(function(){ if (el.textContent !== name) el.textContent = name; });
        mo.observe(el, { childList: true, characterData: true, subtree: true });
        setTimeout(function(){ mo.disconnect(); }, 8000); // 8 秒后基本稳定
      } catch(e){}
    })(group);


    $('#groupTitle').text(group);

    var cards = item.children.map(function(s){
      var seg = String(s).split(' '); if (seg.length < 2) return '';
      var wh = seg[0].split('.'); var iw = +wh[0]||1, ih = +wh[1]||1;
      var file = seg[1]; var url = build(group, file); var name = file.split('.')[0];

      return '' +
        '<div class="card" style="width:'+W+'px">' +
          '<div class="ImageInCard" style="height:'+(W*ih/iw)+'px">' +
            '<a data-fancybox="gallery" href="'+url+'" data-caption="'+name+'" title="'+name+'">' +
              '<img loading="lazy" src="'+url+'" width="'+W+'"/>' +
            '</a>' +
          '</div>' +
        '</div>';
    }).join('');

    $grid.html(cards);

    try {
      var grid = new Minigrid({ container: $grid[0], item: '.card', gutter: 12 });
      grid.mount();
      var imgs = $grid.find('img'), left = imgs.length;
      imgs.on('load error', function(){ if(--left <= 0) grid.mount(); });
      $(window).on('resize', function(){ grid.mount(); });
    } catch(e) { console.warn('Minigrid error:', e.message); }
  }).fail(function(_,s,e){
    $grid.html('<p style="color:#c00">photos.json 加载失败</p>');
    console.error('[gallery-group] photos.json 加载失败：', s, e);
  });
});


document.addEventListener('pjax:complete', function () {
  var g = new URLSearchParams(location.search).get('group');
  if (g) (function(name){
    var el = document.querySelector('#page-site-info #site-title');
    if (el) el.textContent = name;
    document.title = name + ' - 相册';
  })(g);
});
