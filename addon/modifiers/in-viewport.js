import { assert } from '@ember/debug';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { DEBUG } from '@glimmer/env';
import Modifier from 'ember-modifier';
import deepEqual from 'fast-deep-equal';
import { registerDestructor } from '@ember/destroyable';
import { macroCondition, dependencySatisfies } from '@embroider/macros';

const WATCHED_ELEMENTS = DEBUG ? new WeakSet() : undefined;

let modifier;

if (macroCondition(dependencySatisfies('ember-modifier', '>=3.2.0 || 4.x'))) {
  modifier = class InViewportModifier extends Modifier {
    @service inViewport;

    name = 'in-viewport';

    lastOptions;
    element = null;

    modify(element, positional, named) {
      this.element = element;
      this.positional = positional;
      this.named = named;
      this.validateArguments();

      if (!this.didSetup) {
        this.setupWatcher(element);
        registerDestructor(() => this.destroyWatcher(element));
      } else if (this.hasStaleOptions) {
        this.destroyWatcher(element);
        this.setupWatcher(element);
      }
    }

    get options() {
      // eslint-disable-next-line no-unused-vars
      const { onEnter, onExit, ...options } = this.named;
      return options;
    }

    get hasStaleOptions() {
      return !deepEqual(this.options, this.lastOptions);
    }

    validateArguments() {
      assert(
        `'{{in-viewport}}' does not accept positional parameters. Specify listeners via 'onEnter' / 'onExit'.`,
        this.positional.length === 0
      );
      assert(
        `'{{in-viewport}}' either expects 'onEnter', 'onExit' or both to be present.`,
        typeof this.named.onEnter === 'function' ||
          typeof this.named.onExit === 'function'
      );
    }

    @action
    onEnter(...args) {
      if (this.named.onEnter) {
        this.named.onEnter.call(null, this.element, ...args);
      }

      if (!this.options.viewportSpy) {
        this.inViewport.stopWatching(this.element);
      }
    }

    @action
    onExit(...args) {
      if (this.named.onExit) {
        this.named.onExit.call(null, this.element, ...args);
      }
    }

    setupWatcher(element) {
      assert(
        `'${element}' is already being watched. Make sure that '{{in-viewport}}' is only used once on this element and that you are not calling 'inViewport.watchElement(element)' in other places.`,
        !WATCHED_ELEMENTS.has(element)
      );
      if (DEBUG) WATCHED_ELEMENTS.add(element);
      this.inViewport.watchElement(
        element,
        this.options,
        this.onEnter,
        this.onExit
      );
      this.lastOptions = this.options;
    }

    destroyWatcher(element) {
      if (DEBUG) WATCHED_ELEMENTS.delete(element);
      this.inViewport.stopWatching(element);
    }
  };
}

export default modifier;
