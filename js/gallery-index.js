console.log('gallery-index.js loaded');

// 数据与图片前缀
var IMG_DATA = "/photos/photos.json";  // 请确保 source/photos/photos.json 存在并会部署
var IMG_ROOT = "https://cdn.jsdelivr.net/gh/wenjiew-astro/gallery@main/gallery/";

// 从封面页渲染“可点击的封面卡片”，卡片本身就是 <a href="../gallery/?group=xxx">
function enc(s){ return encodeURIComponent(s) }
function build(dir, file){ return IMG_ROOT + enc(dir) + '/' + enc(file) }

$(function(){
  var $index = $("#galleryIndex");
  if (!$index.length) return;

  $.getJSON(IMG_DATA).done(function(list){
    if (!Array.isArray(list) || !list.length) {
      $index.html('<p style="color:#999">暂无相册</p>');
      return;
    }

    var html = list.map(function(g){
      var name  = g.name || '';
      var first = (g.children && g.children[0]) ? String(g.children[0]).split(' ')[1] : null;
      var cover = first ? build(name, first) : 'https://via.placeholder.com/400x240?text=No+Image';
      var tilt  = 'tilt-' + (1 + Math.floor(Math.random()*6));

      // ★ 用相对路径 ../gallery/，从 /galleries/ 跳到 /gallery/，任何根路径都成立
      return '' +
        '<a class="gcard '+tilt+'" href="../gallery/?group='+ enc(name) +'">' +
          '<div class="gimg"><img src="'+cover+'" alt="'+name+'"></div>' +
          '<div class="gmeta"><div class="gtitle">'+name+'</div>' +
          '<div class="gsub">共 '+(g.children?g.children.length:0)+' 张</div></div>' +
        '</a>';
    }).join('');

    $index.html(html);
  }).fail(function(_,s,e){
    console.error('[gallery-index] photos.json 加载失败：', s, e);
  });
});
