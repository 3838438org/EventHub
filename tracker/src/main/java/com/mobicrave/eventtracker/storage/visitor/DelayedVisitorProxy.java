package com.mobicrave.eventtracker.storage.visitor;

import com.mobicrave.eventtracker.storage.filter.ExactMatch;
import com.mobicrave.eventtracker.storage.filter.Regex;

import javax.inject.Provider;

public class DelayedVisitorProxy implements Visitor {
  private final Provider<Visitor> visitorProvider;
  private Visitor cachedVisitor;

  public DelayedVisitorProxy(Provider<Visitor> visitorProvider) {
    this.visitorProvider = visitorProvider;
  }

  @Override
  public boolean visit(ExactMatch exactMatch) {
    if (cachedVisitor == null) {
      cachedVisitor = visitorProvider.get();
    }
    return cachedVisitor.visit(exactMatch);
  }

  @Override
  public boolean visit(Regex regex) {
    if (cachedVisitor == null) {
      cachedVisitor = visitorProvider.get();
    }
    return cachedVisitor.visit(regex);
  }
}
