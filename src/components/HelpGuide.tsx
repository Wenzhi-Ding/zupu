import './HelpGuide.css';

interface HelpGuideProps {
  open: boolean;
  onClose: () => void;
}

export const HelpGuide = ({ open, onClose }: HelpGuideProps) => {
  if (!open) return null;

  return (
    <div className="help-overlay" onClick={onClose}>
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <div className="help-header">
          <h2>使用帮助</h2>
          <button type="button" className="help-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="help-body">
          <div className="help-section">
            <h3>族谱管理</h3>
            <p>点击「族谱管理」按钮打开管理面板。可以加载预置的样例族谱（汉朝皇室、宥阳盛氏），也可以新建族谱并为其命名。在管理面板中还可以通过姓名搜索族谱中的人物。首次进入时会自动弹出管理面板。</p>
          </div>
          <div className="help-section">
            <h3>新建人物</h3>
            <p>点击右上角「+ 新建人物」按钮，输入姓名和性别后添加第一个人物。</p>
          </div>
          <div className="help-section">
            <h3>添加关系</h3>
            <p>选中一个人物后，在右侧面板点击「添加关系」，可以添加父母、子女或配偶。</p>
          </div>
          <div className="help-section">
            <h3>编辑信息</h3>
            <p>选中人物后，可在右侧面板编辑姓名、性别、出生年份、去世年份、称号和简介。</p>
          </div>
          <div className="help-section">
            <h3>范围选择</h3>
            <p>点击「范围选择」按钮进入选择模式。在此模式下，可以逐个点选人物卡片，也可以在画布上拖动进行框选。选中多人后，底部会出现操作栏，支持批量删除或将选中人物移动到新的父节点下。</p>
          </div>
          <div className="help-section">
            <h3>查看关系链</h3>
            <p>点击「展示关系」按钮，然后依次点选两个人物，可以查看他们之间的亲属关系。</p>
          </div>
          <div className="help-section">
            <h3>数据安全</h3>
            <p>所有数据保存在您的浏览器本地存储中，不会上传至任何服务器。建议定期导出数据进行备份。</p>
          </div>
          <div className="help-section">
            <h3>导入导出</h3>
            <p>使用工具栏中的导出/导入按钮，可以将数据保存为JSON文件或从文件恢复数据。导入数据时会覆盖当前所有数据，并自动显示全部族谱（清除之前的筛选视图）。</p>
          </div>
        </div>
      </div>
    </div>
  );
};
