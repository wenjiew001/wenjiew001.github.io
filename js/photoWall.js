var imgDataPath = "/photos/photos.json"; // 先用站点内路径，稳定 200
var imgPath     = "https://cdn.jsdelivr.net/gh/wenjiew-astro/gallery@main/gallery/";
var imgMaxNum   = 50;

var windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
var imageWidth  = windowWidth < 768 ? 145 : 250;

function slugify(s){ return String(s).toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-]+/g,'').replace(/\-+/g,'-').replace(/^\-+|\-+$/g,'')||'tab'; }
function enc(s){ return encodeURIComponent(s); }
function buildImgURL(dir,file){ return imgPath + enc(dir) + '/' + enc(file); }

// 可选：为分组定义“中文/英文标题”这类别名；找不到就用 name 填充
const groupMeta = {
  // '凤凰古城': { title:'Fenghuang', sub:'凤凰古城' },
  // '西湖':     { title:'West Lake', sub:'西湖' },
};

const photo = {
  offset: imgMaxNum,

  init(){
    if (typeof jQuery==='undefined'){ console.error('[photoWall] jQuery 未加载'); return; }
    $.getJSON(imgDataPath,(data)=>{
      if(!Array.isArray(data)||!data.length){
        $('.ImageGrid').html('<div style="padding:1rem;color:#999;">没有可显示的相册数据</div>'); return;
      }
      this.renderIndex(data);      // 上方分组封面区（像示例页）
      this.renderGroups(data);     // 下方分组内容（瀑布流）
      this.bindEvents();
    }).fail((_,s,e)=>{
      console.error('[photoWall] 加载 photos.json 失败：',s,e);
      $('.ImageGrid').html('<div style="padding:1rem;color:#c00;">加载 photos.json 失败</div>');
    });
  },

  renderIndex(data){
    let html='';
    data.forEach((g,idx)=>{
      const {name='',children=[]}=g||{};
      const first=children[0];
      const cover = first ? buildImgURL(name, String(first).split(' ')[1])
                          : 'https://via.placeholder.com/400x240?text=No+Image';
      const meta  = groupMeta[name] || { title:name, sub:name };
      const tiltClass = 'tilt-' + (1 + Math.floor(Math.random()*6));
      html += `
        <div class="gcard ${tiltClass}" data-target="#${slugify(name)}-${idx}" data-group="${enc(name)}">
          <div class="gimg"><img src="${cover}" alt="${meta.title}"></div>
          <div class="gmeta">
            <div class="gtitle">${meta.title}</div>
            <div class="gsub">${meta.sub}（${children.length}）</div>
          </div>
        </div>`;
    });
    $('#galleryIndex').html(html);
  },

  renderGroups(data){
    let liHtml='', panesHtml='';
    data.forEach((group,idx)=>{
      const {name='',children=[]}=group||{};
      const active = idx===0 ? 'active' : '';
      const slug   = `${slugify(name)}-${idx}`;

      // tabs（已被 CSS 隐藏，仅用于内部切分容器）
      liHtml += `
        <li class="nav-item" role="presentation">
          <a class="nav-link ${active} photo-tab" data-toggle="tab"
             href="#${slug}" role="tab" aria-controls="${slug}" aria-selected="${idx===0}">
             ${name}
          </a>
        </li>`;

      // 分组里的图片卡片
      let cards='';
      children.slice(0,this.offset).forEach((item)=>{
        const [size,file]=String(item).split(' ');
        if(!size||!file) return;
        const [w,h]=size.split('.');
        const url=buildImgURL(name,file);
        const imgName=file.split('.')[0];

        cards += `
          <div class="card" style="width:${imageWidth}px">
            <div class="ImageInCard" style="height:${(imageWidth*(+h||1))/(+w||1)}px">
              <a data-fancybox="gallery" href="${url}" data-caption="${imgName}" title="${imgName}">
                <img loading="lazy" src="${url}" width="${imageWidth}" />
              </a>
            </div>
          </div>`;
      });

      panesHtml += `
        <div class="tab-pane fade ${active?'show active':''}" id="${slug}" role="tabpanel">
          <div class="ImageGrid">${cards}</div>
        </div>`;
    });

    const tabs = `<ul class="nav nav-tabs" id="myTab" role="tablist">${liHtml}</ul>`;
    const content = `<div class="tab-content" id="myTabContent">${panesHtml}</div>`;
    $('#imageTab').html(tabs);
    $('.ImageGrid').not('#myTabContent .ImageGrid').remove();
    $('#myTab').after(content);

    this.mountGrids();
  },

  bindEvents(){
    // 点击封面卡片 → 切换到对应分组
    $(document).on('click','.gcard',(e)=>{
      const target=$(e.currentTarget).data('target');
      if(target){ $(`a[href='${target}']`).tab('show'); $('html,body').animate({scrollTop: $('#imageTab').offset().top-16}, 280); }
    });
    // Tab 切换/窗口尺寸更改 → 重新布局
    $(document).on('shown.bs.tab','a[data-toggle="tab"]',()=>this.mountGrids());
    $(window).on('resize',()=>this.mountGrids());
  },

  mountGrids(){
    $(".tab-pane.show.active .ImageGrid, .tab-pane.active .ImageGrid").each(function(){
      try{
        var grid=new Minigrid({ container:this, item:".card", gutter:12 });
        grid.mount();
        const imgs=$(this).find('img'); let left=imgs.length;
        if(!left) return;
        imgs.off('load.pw error.pw').on('load.pw error.pw',()=>{ if(--left<=0) grid.mount(); });
      }catch(e){ console.warn('[photoWall] Minigrid 失败：',e.message); }
    });
  }
};

$(function(){ photo.init(); });
