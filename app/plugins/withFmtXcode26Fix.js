const { withPodfile } = require('@expo/config-plugins');

const START_MARKER = '# @generated begin memory-map-fmt-xcode26-fix';
const END_MARKER = '# @generated end memory-map-fmt-xcode26-fix';

const PATCH = `    ${START_MARKER}
    # Temporary compatibility workaround:
    # React Native 0.81 bundles fmt 11.0.2, which does not compile in C++20
    # mode with Apple Clang 21 / Xcode 26.4+. Keep every other pod on C++20.
    # Remove after upgrading to a React Native version that uses fmt 12+.
    installer.pods_project.targets.each do |target|
      next unless target.name == 'fmt'

      target.build_configurations.each do |build_configuration|
        build_configuration.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      end
    end
    ${END_MARKER}`;

function removeExistingPatch(contents) {
  const start = contents.indexOf(START_MARKER);
  const end = contents.indexOf(END_MARKER);

  if (start === -1 && end === -1) {
    return contents;
  }

  if (start === -1 || end === -1 || end < start) {
    throw new Error('The generated fmt Xcode workaround block is malformed.');
  }

  const lineStart = contents.lastIndexOf('\n', start) + 1;
  const lineEnd = contents.indexOf('\n', end);
  return contents.slice(0, lineStart) + contents.slice(lineEnd === -1 ? contents.length : lineEnd + 1);
}

function addPatchToPostInstall(contents) {
  const cleaned = removeExistingPatch(contents);
  const postInstallEnd = '\n  end\nend';
  const insertionPoint = cleaned.lastIndexOf(postInstallEnd);

  if (insertionPoint === -1 || !cleaned.includes('post_install do |installer|')) {
    throw new Error('Unable to locate the iOS Podfile post_install block for the fmt workaround.');
  }

  return `${cleaned.slice(0, insertionPoint)}\n${PATCH}${cleaned.slice(insertionPoint)}`;
}

module.exports = function withFmtXcode26Fix(config) {
  return withPodfile(config, (podfileConfig) => {
    podfileConfig.modResults.contents = addPatchToPostInstall(
      podfileConfig.modResults.contents
    );
    return podfileConfig;
  });
};

module.exports.addPatchToPostInstall = addPatchToPostInstall;
