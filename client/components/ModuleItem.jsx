import _ from 'lodash';
import filesize from 'filesize';
import cls from 'classnames';

import PureComponent from '../lib/PureComponent';
import s from './ModuleItem.css';

export default class ModuleItem extends PureComponent {
  state = {
    visible: true
  };

  render({ module, showSize }) {
    const invisible = !this.state.visible;
    const classes = cls(s.container, s[this.itemType], {
      [s.invisible]: invisible
    });

    return (
      <div
        className={classes}
        title={invisible ? this.invisibleHint : null}
        onClick={this.handleClick}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        <span dangerouslySetInnerHTML={{ __html: this.titleHtml }} />
        {showSize && [' (', <strong>{filesize(module[showSize])}</strong>, ')']}
      </div>
    );
  }

  get itemType() {
    const { module } = this.props;
    if (!module.path) return 'chunk';
    return module.groups ? 'folder' : 'module';
  }

  get titleHtml() {
    let html;
    const { module } = this.props;
    const title = module.path || module.label;
    const term = this.props.highlightedText;

    if (term) {
      const regexp =
        term instanceof RegExp
          ? new RegExp(term.source, 'igu')
          : new RegExp(`(?:${_.escapeRegExp(term)})+`, 'iu');
      let match;
      let lastMatch;

      do {
        lastMatch = match;
        match = regexp.exec(title);
      } while (match);

      if (lastMatch) {
        html =
          _.escape(title.slice(0, lastMatch.index)) +
          `<strong>${_.escape(lastMatch[0])}</strong>` +
          _.escape(title.slice(lastMatch.index + lastMatch[0].length));
      }
    }

    if (!html) {
      html = _.escape(title);
    }

    return html;
  }

  get invisibleHint() {
    return `${_.upperFirst(this.itemType)} is not rendered in the treemap because it's too small.`;
  }

  get isVisible() {
    const { isVisible } = this.props;
    return isVisible ? isVisible(this.props.module) : true;
  }

  handleClick = () => this.props.onClick(this.props.module);

  handleMouseEnter = () => {
    if (this.props.isVisible) {
      this.setState({ visible: this.isVisible });
    }
  };
}
