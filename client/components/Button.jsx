import cls from 'classnames';
import s from './Button.css';
import PureComponent from '../lib/PureComponent';

export default class Button extends PureComponent {
  render({active, toggle, className, children, ...props}) {
    const classes = cls(className, {
      [s.button]: true,
      [s.active]: active,
      [s.toggle]: toggle
    });

    return (
      <button {...props}
        ref={this.saveRef}
        type="button"
        className={classes}
        disabled={this.disabled}
        onClick={this.handleClick}>
        {children}
      </button>
    );
  }

  get disabled() {
    const {props} = this;
    return (
      props.disabled ||
      (props.active && !props.toggle)
    );
  }

  handleClick = (event) => {
    this.elem.blur();
    this.props.onClick(event);
  }

  saveRef = elem => this.elem = elem;
}
